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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Usuarios</h1>
      <Aviso error={error} />

      <form action={invitarUsuario} className="card grid gap-3 sm:grid-cols-5">
        <input name="nombre" placeholder="Nombre *" required className="input" />
        <input name="email" type="email" placeholder="Email *" required className="input sm:col-span-2" />
        <select name="rol" defaultValue="operador" className="input">
          <option value="operador">Operador</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn">Invitar</button>
      </form>

      <div className="space-y-2">
        {perfiles.map((u) => (
          <form key={u.id} action={actualizarUsuario} className="card grid items-center gap-3 sm:grid-cols-4">
            <input type="hidden" name="id" value={u.id} />
            <p className="font-medium">{u.nombre}{u.id === user.id && " (tú)"}</p>
            <select name="rol" defaultValue={u.rol} disabled={u.id === user.id} aria-label="Rol" className="input">
              <option value="operador">Operador</option>
              <option value="admin">Admin</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activo" defaultChecked={u.activo} disabled={u.id === user.id} /> Activo
            </label>
            {u.id !== user.id && <button className="btn-sec">Guardar</button>}
          </form>
        ))}
      </div>
    </div>
  );
}
