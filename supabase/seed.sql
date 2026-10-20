-- Datos de ejemplo (ejecutar como postgres, p. ej. en el SQL editor).

insert into public.categorias (nombre, descripcion) values
  ('Herramientas', 'Herramientas manuales y eléctricas'),
  ('Insumos', 'Materiales de consumo'),
  ('Limpieza', 'Artículos de aseo');

insert into public.proveedores (nombre, contacto, telefono, email) values
  ('Ferretería Central', 'Ana Pérez', '+56 9 1111 1111', 'ventas@ferreteriacentral.cl'),
  ('Distribuidora Sur', 'Luis Soto', '+56 9 2222 2222', 'pedidos@distsur.cl');

insert into public.productos (sku, nombre, categoria_id, proveedor_id, unidad, precio_costo, precio_venta, stock_minimo, ubicacion)
select v.sku, v.nombre, c.id, p.id, v.unidad, v.costo, v.venta, v.minimo, v.ubicacion
from (values
  ('HER-001', 'Martillo 16 oz', 'Herramientas', 'Ferretería Central', 'unid', 4500, 7990, 5, 'Pasillo 1 - A'),
  ('HER-002', 'Taladro percutor', 'Herramientas', 'Ferretería Central', 'unid', 38000, 54990, 2, 'Pasillo 1 - B'),
  ('INS-001', 'Cinta aisladora', 'Insumos', 'Distribuidora Sur', 'unid', 600, 1290, 20, 'Pasillo 2 - A'),
  ('LIM-001', 'Detergente 5 L', 'Limpieza', 'Distribuidora Sur', 'unid', 3200, 5490, 8, 'Pasillo 3 - C')
) as v(sku, nombre, cat, prov, unidad, costo, venta, minimo, ubicacion)
join public.categorias c on c.nombre = v.cat
join public.proveedores p on p.nombre = v.prov;

-- Stock inicial con su movimiento (sin usuario) para que el historial cuadre.
do $$
declare r record;
begin
  perform set_config('app.registrando', '1', true);
  for r in select id, sku from public.productos loop
    update public.productos set stock_actual = case sku when 'INS-001' then 6 else 12 end where id = r.id;
    insert into public.movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
    select id, 'entrada', stock_actual, 0, stock_actual, 'Stock inicial (seed)' from public.productos where id = r.id;
  end loop;
end $$;
