-- La marca reemplaza al código de barras (no había productos cargados).
alter table public.productos rename column codigo_barras to marca;
