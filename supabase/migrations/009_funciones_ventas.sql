-- Funciones atómicas de ventas, compras, cuotas y cierre de caja.
-- El stock siempre pasa por registrar_movimiento (bloqueo de fila y control de stock negativo).

-- p_items: [{producto_id, cantidad, precio}]. p_cuotas (solo crédito): [{monto, vence}].
-- Contado: total = suma de ítems y entra a caja. Crédito: total = suma de cuotas (precio a crédito, con interés).
create function public.registrar_venta(
  p_cliente_id uuid,
  p_tipo_pago text,
  p_medio text,
  p_items jsonb,
  p_cuotas jsonb default null,
  p_nota text default null
) returns public.ventas
language plpgsql security definer set search_path = '' as $$
declare
  v_venta public.ventas;
  v_item record;
  v_total numeric;
begin
  if not public.es_activo() then
    raise exception 'No autorizado';
  end if;
  if p_tipo_pago is null or p_tipo_pago not in ('contado', 'credito') then
    raise exception 'Tipo de pago inválido';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto';
  end if;
  if p_cliente_id is not null and not exists (select 1 from public.clientes where id = p_cliente_id and activo) then
    raise exception 'Cliente no encontrado';
  end if;

  if p_tipo_pago = 'contado' then
    select sum(x.cantidad * x.precio) into v_total
    from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric, precio numeric);
  else
    if p_cliente_id is null then
      raise exception 'La venta a cuotas necesita un cliente';
    end if;
    if jsonb_typeof(p_cuotas) is distinct from 'array' or jsonb_array_length(p_cuotas) = 0 then
      raise exception 'Define al menos una cuota';
    end if;
    select sum(c.monto) into v_total from jsonb_to_recordset(p_cuotas) as c(monto numeric, vence date);
  end if;
  if v_total is null or v_total < 0 then
    raise exception 'Montos inválidos';
  end if;

  insert into public.ventas (cliente_id, tipo_pago, medio, total, nota)
  values (p_cliente_id, p_tipo_pago, case when p_tipo_pago = 'contado' then p_medio end, v_total, nullif(trim(p_nota), ''))
  returning * into v_venta;

  for v_item in select * from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric, precio numeric) loop
    perform public.registrar_movimiento(v_item.producto_id, 'salida', v_item.cantidad, 'Venta #' || v_venta.numero);
    insert into public.venta_items (venta_id, producto_id, cantidad, precio)
    values (v_venta.id, v_item.producto_id, v_item.cantidad, v_item.precio);
  end loop;

  if p_tipo_pago = 'contado' then
    if v_total > 0 then
      insert into public.caja_movimientos (tipo, monto, medio, categoria, concepto, venta_id)
      values ('ingreso', v_total, p_medio, 'Venta', 'Venta #' || v_venta.numero, v_venta.id);
    end if;
  else
    insert into public.cuotas (venta_id, numero, monto, vence)
    select v_venta.id, row_number() over (order by c.vence), c.monto, c.vence
    from jsonb_to_recordset(p_cuotas) as c(monto numeric, vence date);
  end if;
  return v_venta;
end $$;

-- p_items: [{producto_id, cantidad, costo}]. Suma stock, deja el último costo en el producto y registra el egreso.
create function public.registrar_compra(
  p_proveedor_id uuid,
  p_medio text,
  p_items jsonb,
  p_nota text default null
) returns public.compras
language plpgsql security definer set search_path = '' as $$
declare
  v_compra public.compras;
  v_item record;
  v_total numeric;
begin
  if not public.es_activo() then
    raise exception 'No autorizado';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto';
  end if;
  select sum(x.cantidad * x.costo) into v_total
  from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric, costo numeric);
  if v_total is null or v_total < 0 then
    raise exception 'Montos inválidos';
  end if;

  insert into public.compras (proveedor_id, medio, total, nota)
  values (p_proveedor_id, p_medio, v_total, nullif(trim(p_nota), ''))
  returning * into v_compra;

  for v_item in select * from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric, costo numeric) loop
    perform public.registrar_movimiento(v_item.producto_id, 'entrada', v_item.cantidad, 'Compra #' || v_compra.numero);
    update public.productos set precio_costo = v_item.costo where id = v_item.producto_id;
    insert into public.compra_items (compra_id, producto_id, cantidad, costo)
    values (v_compra.id, v_item.producto_id, v_item.cantidad, v_item.costo);
  end loop;

  if v_total > 0 then
    insert into public.caja_movimientos (tipo, monto, medio, categoria, concepto, compra_id)
    values ('egreso', v_total, p_medio, 'Compra de mercadería', 'Compra #' || v_compra.numero, v_compra.id);
  end if;
  return v_compra;
end $$;

-- Abono a una cuota. p_monto null = paga todo el saldo. Cada abono entra a caja.
create function public.abonar_cuota(
  p_cuota_id uuid,
  p_monto numeric,
  p_medio text
) returns public.cuotas
language plpgsql security definer set search_path = '' as $$
declare
  v_cuota public.cuotas;
  v_saldo numeric;
  v_monto numeric;
  v_numero bigint;
begin
  if not public.es_activo() then
    raise exception 'No autorizado';
  end if;
  select * into v_cuota from public.cuotas where id = p_cuota_id for update;
  if not found then
    raise exception 'Cuota no encontrada';
  end if;
  v_saldo := v_cuota.monto - v_cuota.pagado;
  if v_saldo <= 0 then
    raise exception 'La cuota ya está pagada';
  end if;
  v_monto := coalesce(p_monto, v_saldo);
  if v_monto <= 0 then
    raise exception 'Monto inválido';
  end if;
  if v_monto > v_saldo then
    raise exception 'El abono supera el saldo de la cuota (%)', v_saldo;
  end if;

  update public.cuotas set pagado = pagado + v_monto where id = p_cuota_id returning * into v_cuota;
  select numero into v_numero from public.ventas where id = v_cuota.venta_id;
  insert into public.caja_movimientos (tipo, monto, medio, categoria, concepto, venta_id, cuota_id)
  values ('ingreso', v_monto, p_medio, 'Cuota', format('Cuota %s de venta #%s', v_cuota.numero, v_numero), v_cuota.venta_id, v_cuota.id);
  return v_cuota;
end $$;

-- Cierra la caja abierta: esperado = monto inicial + ingresos - egresos en efectivo desde la apertura.
create function public.cerrar_caja(p_contado numeric) returns public.cajas
language plpgsql security definer set search_path = '' as $$
declare
  v_caja public.cajas;
  v_esperado numeric;
begin
  if not public.es_activo() then
    raise exception 'No autorizado';
  end if;
  if p_contado is null or p_contado < 0 then
    raise exception 'Monto contado inválido';
  end if;
  select * into v_caja from public.cajas where cerrada_at is null for update;
  if not found then
    raise exception 'No hay una caja abierta';
  end if;

  select v_caja.monto_inicial + coalesce(sum(case tipo when 'ingreso' then monto else -monto end), 0) into v_esperado
  from public.caja_movimientos
  where medio = 'efectivo' and created_at >= v_caja.abierta_at;

  update public.cajas
  set cerrada_at = now(), contado = p_contado, esperado = v_esperado, diferencia = p_contado - v_esperado
  where id = v_caja.id
  returning * into v_caja;
  return v_caja;
end $$;

revoke all on function public.registrar_venta(uuid, text, text, jsonb, jsonb, text) from public, anon;
revoke all on function public.registrar_compra(uuid, text, jsonb, text) from public, anon;
revoke all on function public.abonar_cuota(uuid, numeric, text) from public, anon;
revoke all on function public.cerrar_caja(numeric) from public, anon;
grant execute on function public.registrar_venta(uuid, text, text, jsonb, jsonb, text) to authenticated;
grant execute on function public.registrar_compra(uuid, text, jsonb, text) to authenticated;
grant execute on function public.abonar_cuota(uuid, numeric, text) to authenticated;
grant execute on function public.cerrar_caja(numeric) to authenticated;
