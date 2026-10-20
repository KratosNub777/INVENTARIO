-- Seguridad por filas y protecciones de stock / borrado.

create function public.es_activo() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo)
$$;

create function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo and rol = 'admin')
$$;

alter table public.perfiles enable row level security;
alter table public.categorias enable row level security;
alter table public.proveedores enable row level security;
alter table public.productos enable row level security;
alter table public.movimientos enable row level security;

-- perfiles: todos los activos leen; solo admin modifica (el alta la hace el trigger de Auth)
create policy perfiles_select on public.perfiles for select to authenticated using (public.es_activo());
create policy perfiles_update on public.perfiles for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- categorias y proveedores: leen todos, gestiona solo admin
create policy categorias_select on public.categorias for select to authenticated using (public.es_activo());
create policy categorias_admin on public.categorias for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy proveedores_select on public.proveedores for select to authenticated using (public.es_activo());
create policy proveedores_admin on public.proveedores for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- productos: operador y admin crean/editan; no hay DELETE (se desactiva)
create policy productos_select on public.productos for select to authenticated using (public.es_activo());
create policy productos_insert on public.productos for insert to authenticated with check (public.es_activo());
create policy productos_update on public.productos for update to authenticated
  using (public.es_activo()) with check (public.es_activo());

-- movimientos: solo lectura; se insertan únicamente con registrar_movimiento()
create policy movimientos_select on public.movimientos for select to authenticated using (public.es_activo());

-- El stock no se edita a mano y solo un admin desactiva productos.
create function public.proteger_productos() returns trigger
language plpgsql as $$
begin
  if current_setting('app.registrando', true) is distinct from '1' then
    if tg_op = 'INSERT' then
      new.stock_actual := 0;
    elsif new.stock_actual <> old.stock_actual then
      raise exception 'El stock solo cambia con registrar_movimiento';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.activo and not new.activo
     and auth.uid() is not null and not public.es_admin() then
    raise exception 'Solo un administrador puede eliminar productos';
  end if;
  return new;
end $$;

create trigger productos_proteger before insert or update on public.productos
  for each row execute function public.proteger_productos();
