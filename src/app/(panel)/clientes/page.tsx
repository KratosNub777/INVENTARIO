import Link from "next/link";
import { eliminarCliente, guardarCliente } from "@/actions/clientes";
import { Aviso } from "@/components/aviso";
import { getSesion } from "@/lib/auth";
import { dinero } from "@/lib/util";
import type { Cliente } from "@/types/database";

type Pendiente = { monto: number; pagado: number; ventas: { cliente_id: string } | null };

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase, perfil } = await getSesion();
  const admin = perfil.rol === "admin";
  // Quita caracteres que rompen la sintaxis del filtro .or() de PostgREST.
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim();
  const error = sp.error;

  let consulta = supabase.from("clientes").select("*").eq("activo", true).order("nombre");
  if (q) consulta = consulta.or(`nombre.ilike.%${q}%,rut.ilike.%${q}%,telefono.ilike.%${q}%`);
  const [{ data }, { data: pendientes }] = await Promise.all([
    consulta,
    supabase.from("cuotas").select("monto, pagado, ventas(cliente_id)").eq("pagada", false),
  ]);
  const clientes = (data ?? []) as Cliente[];
  const deuda = new Map<string, number>();
  for (const c of (pendientes ?? []) as unknown as Pendiente[]) {
    const id = c.ventas?.cliente_id;
    if (id) deuda.set(id, (deuda.get(id) ?? 0) + Number(c.monto) - Number(c.pagado));
  }

  return (
    <div className="space-y-4">
      <h1 className="titulo">Clientes</h1>
      <Aviso error={error} />

      {admin && (
        <form action={guardarCliente} className="card grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <input name="nombre" placeholder="Nombre *" required className="input" />
          <input name="rut" placeholder="RUT" className="input" />
          <input name="telefono" placeholder="Teléfono" className="input" />
          <input name="email" type="email" placeholder="Email" className="input" />
          <input name="direccion" placeholder="Dirección" className="input" />
          <button className="btn">Agregar</button>
        </form>
      )}

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre, RUT o teléfono" className="input" />
        <button className="btn-sec">Buscar</button>
      </form>

      <div className="space-y-2">
        {clientes.map((c) => {
          const debe = deuda.get(c.id) ?? 0;
          const saldo = debe > 0 && (
            <Link href={`/cobranza?cliente=${c.id}`} className="chip chip-alerta self-center justify-self-start">Debe {dinero(debe)}</Link>
          );
          return admin ? (
            <form key={c.id} action={guardarCliente} className="card grid gap-3 sm:grid-cols-3 lg:grid-cols-8">
              <input type="hidden" name="id" value={c.id} />
              <input name="nombre" defaultValue={c.nombre} required aria-label="Nombre" className="input" />
              <input name="rut" defaultValue={c.rut ?? ""} aria-label="RUT" className="input" />
              <input name="telefono" defaultValue={c.telefono ?? ""} aria-label="Teléfono" className="input" />
              <input name="email" type="email" defaultValue={c.email ?? ""} aria-label="Email" className="input" />
              <input name="direccion" defaultValue={c.direccion ?? ""} aria-label="Dirección" className="input" />
              {saldo || <span className="hidden lg:block" />}
              <button className="btn-sec">Guardar</button>
              <button formAction={eliminarCliente} formNoValidate className="btn-peligro">Eliminar</button>
            </form>
          ) : (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{c.nombre}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{[c.rut, c.telefono, c.email, c.direccion].filter(Boolean).join(" · ")}</p>
              </div>
              {saldo}
            </div>
          );
        })}
        {!clientes.length && <p className="text-sm text-zinc-600 dark:text-zinc-400">{q ? "Ningún cliente coincide con la búsqueda." : "Aún no hay clientes."}</p>}
      </div>
    </div>
  );
}
