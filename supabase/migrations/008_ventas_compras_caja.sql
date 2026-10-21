-- Clientes, ventas (contado / cuotas), compras y caja.
-- Ventas, compras, cuotas y caja automática se escriben solo con las funciones de 009.

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rut text,
  telefono text,
  email text,
  direccion text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.clientes (nombre);

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  cliente_id uuid references public.clientes(id),
  tipo_pago text not null check (tipo_pago in ('contado', 'credito')),
  medio text check (medio in ('efectivo', 'transferencia', 'tarjeta')),
  total numeric(12,2) not null check (total >= 0),
  nota text,
  usuario_id uuid default auth.uid() references public.perfiles(id),
  created_at timestamptz not null default now(),
  check (tipo_pago = 'contado' or cliente_id is not null),
  check (tipo_pago = 'credito' or medio is not null)
);
create index on public.ventas (created_at desc);
create index on public.ventas (cliente_id);
create index on public.ventas (usuario_id);

create table public.venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id),
  producto_id uuid not null references public.productos(id),
  cantidad numeric(12,3) not null check (cantidad > 0),
  precio numeric(12,2) not null check (precio >= 0)
);
create index on public.venta_items (venta_id);
create index on public.venta_items (producto_id);

create table public.cuotas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id),
  numero int not null,
  monto numeric(12,2) not null check (monto > 0),
  vence date not null,
  pagado numeric(12,2) not null default 0 check (pagado >= 0),
  -- columna generada: PostgREST no compara dos columnas
  pagada boolean generated always as (pagado >= monto) stored,
  unique (venta_id, numero),
  check (pagado <= monto)
);
create index on public.cuotas (vence) where not pagada;

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  proveedor_id uuid references public.proveedores(id),
  medio text not null check (medio in ('efectivo', 'transferencia', 'tarjeta')),
  total numeric(12,2) not null check (total >= 0),
  nota text,
  usuario_id uuid default auth.uid() references public.perfiles(id),
  created_at timestamptz not null default now()
);
create index on public.compras (created_at desc);
create index on public.compras (proveedor_id);
create index on public.compras (usuario_id);

create table public.compra_items (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id),
  producto_id uuid not null references public.productos(id),
  cantidad numeric(12,3) not null check (cantidad > 0),
  costo numeric(12,2) not null check (costo >= 0)
);
create index on public.compra_items (compra_id);
create index on public.compra_items (producto_id);

create table public.caja_movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  monto numeric(12,2) not null check (monto > 0),
  medio text not null check (medio in ('efectivo', 'transferencia', 'tarjeta')),
  categoria text not null,
  concepto text,
  venta_id uuid references public.ventas(id),
  compra_id uuid references public.compras(id),
  cuota_id uuid references public.cuotas(id),
  usuario_id uuid default auth.uid() references public.perfiles(id),
  created_at timestamptz not null default now()
);
create index on public.caja_movimientos (created_at desc);
create index on public.caja_movimientos (venta_id);
create index on public.caja_movimientos (compra_id);
create index on public.caja_movimientos (cuota_id);
create index on public.caja_movimientos (usuario_id);

-- Apertura y cierre diario (arqueo del efectivo). Solo una caja abierta a la vez.
create table public.cajas (
  id uuid primary key default gen_random_uuid(),
  abierta_at timestamptz not null default now(),
  monto_inicial numeric(12,2) not null check (monto_inicial >= 0),
  cerrada_at timestamptz,
  contado numeric(12,2),
  esperado numeric(12,2),
  diferencia numeric(12,2),
  usuario_id uuid default auth.uid() references public.perfiles(id)
);
create unique index cajas_una_abierta on public.cajas ((true)) where cerrada_at is null;
create index on public.cajas (abierta_at desc);
create index on public.cajas (usuario_id);

create view public.v_saldo_caja with (security_invoker = true) as
select medio, sum(case tipo when 'ingreso' then monto else -monto end) as saldo
from public.caja_movimientos
group by medio;

-- RLS
alter table public.clientes enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_items enable row level security;
alter table public.cuotas enable row level security;
alter table public.compras enable row level security;
alter table public.compra_items enable row level security;
alter table public.caja_movimientos enable row level security;
alter table public.cajas enable row level security;

create policy clientes_select on public.clientes for select to authenticated using (public.es_activo());
create policy clientes_admin on public.clientes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy ventas_select on public.ventas for select to authenticated using (public.es_activo());
create policy venta_items_select on public.venta_items for select to authenticated using (public.es_activo());
create policy compras_select on public.compras for select to authenticated using (public.es_activo());
create policy compra_items_select on public.compra_items for select to authenticated using (public.es_activo());

-- cuotas: se pueden corregir monto y fecha mientras no estén pagadas; los pagos van por abonar_cuota()
create policy cuotas_select on public.cuotas for select to authenticated using (public.es_activo());
create policy cuotas_update on public.cuotas for update to authenticated
  using (public.es_admin() and not pagada) with check (public.es_admin());
revoke update on public.cuotas from authenticated;
grant update (monto, vence) on public.cuotas to authenticated;

-- caja: inserción directa solo de movimientos manuales; nada se edita ni borra (se corrige con un contramovimiento)
create policy caja_select on public.caja_movimientos for select to authenticated using (public.es_activo());
create policy caja_insert on public.caja_movimientos for insert to authenticated with check (
  public.es_activo() and venta_id is null and compra_id is null and cuota_id is null and usuario_id = auth.uid()
);

create policy cajas_select on public.cajas for select to authenticated using (public.es_activo());
create policy cajas_insert on public.cajas for insert to authenticated with check (
  public.es_activo() and cerrada_at is null and contado is null and usuario_id = auth.uid()
);
