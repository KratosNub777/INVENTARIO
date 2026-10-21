-- La bodega está en Paraguay: el identificador tributario es el RUC.
alter table public.clientes rename column rut to ruc;
