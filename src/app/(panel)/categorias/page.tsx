import { eliminarCategoria, guardarCategoria } from "@/actions/categorias";
import { Aviso } from "@/components/aviso";
import { getSesion } from "@/lib/auth";
import type { Categoria } from "@/types/database";

export default async function Categorias({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase, perfil } = await getSesion();
  const admin = perfil.rol === "admin";
  const { data } = await supabase.from("categorias").select("*").order("nombre");
  const categorias = (data ?? []) as Categoria[];

  return (
    <div className="space-y-6">
      <h1 className="titulo">Categorías</h1>
      <Aviso error={error} />

      {admin && (
        <form action={guardarCategoria} className="card grid gap-4 sm:grid-cols-3">
          <input name="nombre" placeholder="Nombre *" required className="input" />
          <input name="descripcion" placeholder="Descripción" className="input" />
          <button className="btn">Agregar</button>
        </form>
      )}

      <div className="space-y-3">
        {categorias.map((c) =>
          admin ? (
            <form key={c.id} action={guardarCategoria} className="card grid gap-4 sm:grid-cols-4">
              <input type="hidden" name="id" value={c.id} />
              <input name="nombre" defaultValue={c.nombre} required aria-label="Nombre" className="input" />
              <input name="descripcion" defaultValue={c.descripcion ?? ""} aria-label="Descripción" className="input sm:col-span-1" />
              <button className="btn-sec">Guardar</button>
              <button formAction={eliminarCategoria} formNoValidate className="btn-peligro">Eliminar</button>
            </form>
          ) : (
            <div key={c.id} className="card">
              <p className="font-medium">{c.nombre}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{c.descripcion}</p>
            </div>
          ),
        )}
        {!categorias.length && <p className="text-sm text-zinc-600 dark:text-zinc-400">Aún no hay categorías.</p>}
      </div>
    </div>
  );
}
