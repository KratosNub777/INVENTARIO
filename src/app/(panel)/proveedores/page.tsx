import { eliminarProveedor, guardarProveedor } from "@/actions/proveedores";
import { Aviso } from "@/components/aviso";
import { getSesion } from "@/lib/auth";
import type { Proveedor } from "@/types/database";

export default async function Proveedores({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase, perfil } = await getSesion();
  const admin = perfil.rol === "admin";
  const { data } = await supabase.from("proveedores").select("*").order("nombre");
  const proveedores = (data ?? []) as Proveedor[];

  return (
    <div className="space-y-6">
      <h1 className="titulo">Proveedores</h1>
      <Aviso error={error} />

      {admin && (
        <form action={guardarProveedor} className="card grid gap-4 sm:grid-cols-5">
          <input name="nombre" placeholder="Nombre *" required className="input" />
          <input name="contacto" placeholder="Contacto" className="input" />
          <input name="telefono" placeholder="Teléfono" className="input" />
          <input name="email" type="email" placeholder="Email" className="input" />
          <button className="btn">Agregar</button>
        </form>
      )}

      <div className="space-y-3">
        {proveedores.map((v) =>
          admin ? (
            <form key={v.id} action={guardarProveedor} className="card grid gap-4 sm:grid-cols-6">
              <input type="hidden" name="id" value={v.id} />
              <input name="nombre" defaultValue={v.nombre} required aria-label="Nombre" className="input" />
              <input name="contacto" defaultValue={v.contacto ?? ""} aria-label="Contacto" className="input" />
              <input name="telefono" defaultValue={v.telefono ?? ""} aria-label="Teléfono" className="input" />
              <input name="email" type="email" defaultValue={v.email ?? ""} aria-label="Email" className="input" />
              <button className="btn-sec">Guardar</button>
              <button formAction={eliminarProveedor} formNoValidate className="btn-peligro">Eliminar</button>
            </form>
          ) : (
            <div key={v.id} className="card">
              <p className="font-medium">{v.nombre}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{[v.contacto, v.telefono, v.email].filter(Boolean).join(" · ")}</p>
            </div>
          ),
        )}
        {!proveedores.length && <p className="text-sm text-zinc-600 dark:text-zinc-400">Aún no hay proveedores.</p>}
      </div>
    </div>
  );
}
