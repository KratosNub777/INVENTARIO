-- Solo lo usan 2 personas de confianza: todos los usuarios son administradores.

alter table public.perfiles alter column rol set default 'admin';

create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)), 'admin');
  return new;
end $$;

update public.perfiles set rol = 'admin' where rol <> 'admin';
