import Link from "next/link";
import { MapPin } from "@phosphor-icons/react/dist/ssr";
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
  if (q) consulta = consulta.or(`nombre.ilike.%${q}%,ruc.ilike.%${q}%,telefono.ilike.%${q}%`);
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
        <form action={guardarCliente} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input name="nombre" placeholder="Nombre *" required className="input" />
          <input name="ruc" placeholder="RUC" className="input" />
          <input name="telefono" placeholder="Teléfono" className="input" />
          <input name="email" type="email" placeholder="Email" className="input" />
          <input name="direccion" placeholder="Dirección" className="input" />
          <input name="direccion_url" type="url" placeholder="Link de la dirección (Google Maps)" className="input lg:col-span-2" />
          <button className="btn">Agregar</button>
        </form>
      )}

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre, RUC o teléfono" className="input" />
        <button className="btn-sec">Buscar</button>
      </form>

      <div className="space-y-2">
        {clientes.map((c) => {
          const debe = deuda.get(c.id) ?? 0;
          const saldo = debe > 0 && (
            <Link href={`/cobranza?cliente=${c.id}`} className="chip chip-alerta">Debe {dinero(debe)}</Link>
          );
          const mapa = c.direccion_url && (
            <a href={c.direccion_url} target="_blank" rel="noopener noreferrer" className="chip chip-ok gap-1 hover:underline">
              <MapPin size={12} weight="bold" /> Ver mapa
            </a>
          );
          return admin ? (
            <form key={c.id} action={guardarCliente} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="id" value={c.id} />
              <input name="nombre" defaultValue={c.nombre} required aria-label="Nombre" className="input" />
              <input name="ruc" defaultValue={c.ruc ?? ""} aria-label="RUC" placeholder="RUC" className="input" />
              <input name="telefono" defaultValue={c.telefono ?? ""} aria-label="Teléfono" placeholder="Teléfono" className="input" />
              <input name="email" type="email" defaultValue={c.email ?? ""} aria-label="Email" placeholder="Email" className="input" />
              <input name="direccion" defaultValue={c.direccion ?? ""} aria-label="Dirección" placeholder="Dirección" className="input" />
              <input name="direccion_url" type="url" defaultValue={c.direccion_url ?? ""} aria-label="Link de la dirección" placeholder="Link de la dirección (Google Maps)" className="input lg:col-span-2" />
              <div className="flex gap-2">
                <button className="btn-sec flex-1">Guardar</button>
                <button formAction={eliminarCliente} formNoValidate className="btn-peligro flex-1">Eliminar</button>
              </div>
              {(saldo || mapa) && <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">{saldo}{mapa}</div>}
            </form>
          ) : (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{c.nombre}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{[c.ruc, c.telefono, c.email, c.direccion].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2">{saldo}{mapa}</div>
            </div>
          );
        })}
        {!clientes.length && <p className="text-sm text-zinc-600 dark:text-zinc-400">{q ? "Ningún cliente coincide con la búsqueda." : "Aún no hay clientes."}</p>}
      </div>
    </div>
  );
}
