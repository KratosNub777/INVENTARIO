import { actualizarUsuario, invitarUsuario } from "@/actions/usuarios";
import { Aviso } from "@/components/aviso";
import { requireAdmin } from "@/lib/auth";
import type { Perfil } from "@/types/database";

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase, user } = await requireAdmin();
  const { data } = await supabase.from("perfiles").select("*").order("created_at");
  const perfiles = (data ?? []) as Perfil[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo">Usuarios</h1>
        <p className="subtitulo">Todos los usuarios tienen acceso completo.</p>
      </div>
      <Aviso error={error} />

      <form action={invitarUsuario} className="card grid gap-4 sm:grid-cols-4">
        <input name="nombre" placeholder="Nombre" aria-label="Nombre" required className="input" />
        <input name="email" type="email" placeholder="Email" aria-label="Email" required className="input sm:col-span-2" />
        <button className="btn">Invitar</button>
      </form>

      <div className="space-y-3 escalonado">
        {perfiles.map((u) => (
          <form key={u.id} action={actualizarUsuario} className="card flex items-center justify-between gap-3">
            <input type="hidden" name="id" value={u.id} />
            <p className="font-medium">{u.nombre}{u.id === user.id && <span className="ml-2 text-sm text-zinc-500">(tú)</span>}</p>
            {u.id !== user.id && (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="activo" defaultChecked={u.activo} className="size-4 accent-emerald-700" /> Activo
                </label>
                <button className="btn-sec">Guardar</button>
              </div>
            )}
          </form>
        ))}
      </div>
    </div>
  );
}
