-- Bucket público de imágenes de productos; solo usuarios activos suben o reemplazan.

insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
on conflict (id) do nothing;

create policy productos_img_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and public.es_activo());
create policy productos_img_update on storage.objects for update to authenticated
  using (bucket_id = 'productos' and public.es_activo());
