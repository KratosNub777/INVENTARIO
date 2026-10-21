-- Elimina una venta y deshace sus efectos: devuelve el stock (movimiento de entrada, queda en el historial),
-- y borra sus cuotas y sus movimientos de caja (venta al contado o abonos de cuotas).
create function public.eliminar_venta(p_venta_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_venta public.ventas;
  v_item record;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;
  select * into v_venta from public.ventas where id = p_venta_id for update;
  if not found then
    raise exception 'Venta no encontrada';
  end if;

  for v_item in select producto_id, cantidad from public.venta_items where venta_id = p_venta_id loop
    perform public.registrar_movimiento(v_item.producto_id, 'entrada', v_item.cantidad, 'Venta #' || v_venta.numero || ' eliminada');
  end loop;

  delete from public.caja_movimientos where venta_id = p_venta_id;
  delete from public.cuotas where venta_id = p_venta_id;
  delete from public.venta_items where venta_id = p_venta_id;
  delete from public.ventas where id = p_venta_id;
end $$;

revoke all on function public.eliminar_venta(uuid) from public, anon;
grant execute on function public.eliminar_venta(uuid) to authenticated;
