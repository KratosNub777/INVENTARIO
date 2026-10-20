-- registrar_movimiento: única vía para cambiar stock. Bloquea la fila, valida y registra en una transacción.
-- entrada/salida: p_cantidad > 0. ajuste: p_cantidad = stock contado (>= 0).

create function public.registrar_movimiento(
  p_producto_id uuid,
  p_tipo text,
  p_cantidad numeric,
  p_motivo text default null
) returns public.movimientos
language plpgsql security definer set search_path = '' as $$
declare
  v_anterior numeric;
  v_nuevo numeric;
  v_mov public.movimientos;
begin
  if not public.es_activo() then
    raise exception 'No autorizado';
  end if;
  if p_tipo not in ('entrada', 'salida', 'ajuste') then
    raise exception 'Tipo de movimiento inválido';
  end if;
  if p_cantidad is null or p_cantidad < 0 or (p_tipo <> 'ajuste' and p_cantidad = 0) then
    raise exception 'Cantidad inválida';
  end if;

  select stock_actual into v_anterior
  from public.productos where id = p_producto_id and activo for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  v_nuevo := case p_tipo
    when 'entrada' then v_anterior + p_cantidad
    when 'salida' then v_anterior - p_cantidad
    else p_cantidad
  end;
  if v_nuevo < 0 then
    raise exception 'Stock insuficiente: disponible %, solicitado %', v_anterior, p_cantidad;
  end if;
  if p_tipo = 'ajuste' and v_nuevo = v_anterior then
    raise exception 'El conteo coincide con el stock actual';
  end if;

  perform set_config('app.registrando', '1', true);
  update public.productos set stock_actual = v_nuevo where id = p_producto_id;

  insert into public.movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
  values (
    p_producto_id, p_tipo,
    case when p_tipo = 'ajuste' then v_nuevo - v_anterior else p_cantidad end,
    v_anterior, v_nuevo, nullif(trim(p_motivo), ''), auth.uid()
  )
  returning * into v_mov;
  return v_mov;
end $$;

revoke all on function public.registrar_movimiento(uuid, text, numeric, text) from public, anon;
grant execute on function public.registrar_movimiento(uuid, text, numeric, text) to authenticated;
