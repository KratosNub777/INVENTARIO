-- Vistas para dashboard y reportes (respetan RLS del usuario que consulta).

create view public.v_valor_inventario with (security_invoker = true) as
select
  count(*)::int as total_productos,
  coalesce(sum(stock_actual), 0) as total_unidades,
  coalesce(sum(stock_actual * precio_costo), 0) as valor_costo,
  coalesce(sum(stock_actual * precio_venta), 0) as valor_venta
from public.productos
where activo;

create view public.v_stock_bajo with (security_invoker = true) as
select id, sku, nombre, unidad, stock_actual, stock_minimo, ubicacion
from public.productos
where activo and stock_actual <= stock_minimo
order by stock_actual - stock_minimo;
