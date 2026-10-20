-- Endurece funciones tras revisar los advisors de seguridad.

alter function public.set_updated_at() set search_path = '';
alter function public.proteger_productos() set search_path = '';

-- Solo las usa el trigger de Auth; las RLS usan es_activo/es_admin con el rol authenticated.
revoke execute on function public.crear_perfil() from public, anon, authenticated;
revoke execute on function public.es_activo() from public, anon;
revoke execute on function public.es_admin() from public, anon;

-- La bandera app.registrando se apaga al terminar, para que no autorice ediciones posteriores de la misma transacción.
create or replace function public.registrar_movimiento(
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
  perform set_config('app.registrando', '', true);

  insert into public.movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
  values (
    p_producto_id, p_tipo,
    case when p_tipo = 'ajuste' then v_nuevo - v_anterior else p_cantidad end,
    v_anterior, v_nuevo, nullif(trim(p_motivo), ''), auth.uid()
  )
  returning * into v_mov;
  return v_mov;
end $$;
