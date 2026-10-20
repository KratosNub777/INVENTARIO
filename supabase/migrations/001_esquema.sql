-- Esquema base: perfiles, categorias, proveedores, productos, movimientos.

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  rol text not null default 'operador' check (rol in ('admin', 'operador')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text
);

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contacto text,
  telefono text,
  email text
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  codigo_barras text,
  nombre text not null,
  descripcion text,
  categoria_id uuid references public.categorias(id) on delete set null,
  proveedor_id uuid references public.proveedores(id) on delete set null,
  unidad text not null default 'unid',
  precio_costo numeric(12,2) not null default 0 check (precio_costo >= 0),
  precio_venta numeric(12,2) not null default 0 check (precio_venta >= 0),
  stock_actual numeric(12,3) not null default 0 check (stock_actual >= 0),
  stock_minimo numeric(12,3) not null default 0 check (stock_minimo >= 0),
  ubicacion text,
  imagen_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.productos (categoria_id);
create index on public.productos (proveedor_id);
create index on public.productos (nombre);

create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id),
  tipo text not null check (tipo in ('entrada', 'salida', 'ajuste')),
  -- entrada/salida: cantidad > 0. ajuste: diferencia con signo (nuevo - anterior), distinta de 0.
  cantidad numeric(12,3) not null,
  stock_anterior numeric(12,3) not null,
  stock_nuevo numeric(12,3) not null,
  motivo text,
  usuario_id uuid references public.perfiles(id),
  created_at timestamptz not null default now(),
  check ((tipo = 'ajuste' and cantidad <> 0) or (tipo <> 'ajuste' and cantidad > 0))
);
create index on public.movimientos (producto_id, created_at desc);
create index on public.movimientos (created_at desc);

-- updated_at automático
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger productos_updated_at before update on public.productos
  for each row execute function public.set_updated_at();

-- Cada usuario nuevo de Auth recibe un perfil; el primero en registrarse es admin.
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    case when exists (select 1 from public.perfiles) then 'operador' else 'admin' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.crear_perfil();
