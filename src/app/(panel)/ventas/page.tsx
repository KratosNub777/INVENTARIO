import Link from "next/link";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { eliminarVenta } from "@/actions/ventas";
import { Aviso } from "@/components/aviso";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { FormVenta } from "@/components/form-venta";
import { getSesion } from "@/lib/auth";
import { cantidad, dinero, fechaHora } from "@/lib/util";
import type { Venta } from "@/types/database";

type SP = { cliente?: string; tipo?: string; desde?: string; hasta?: string; error?: string };
type Fila = Venta & {
  clientes: { nombre: string } | null;
  perfiles: { nombre: string } | null;
  venta_items: { cantidad: number; productos: { nombre: string } | null }[];
};

export default async function Ventas({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, perfil } = await getSesion();
  const admin = perfil.rol === "admin";

  let consulta = supabase
    .from("ventas")
    .select("*, clientes(nombre), perfiles(nombre), venta_items(cantidad, productos(nombre))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.cliente) consulta = consulta.eq("cliente_id", sp.cliente);
  if (sp.tipo) consulta = consulta.eq("tipo_pago", sp.tipo);
  if (sp.desde) consulta = consulta.gte("created_at", sp.desde);
  if (sp.hasta) consulta = consulta.lte("created_at", `${sp.hasta}T23:59:59`);

  const [{ data }, { data: productos }, { data: clientes }] = await Promise.all([
    consulta,
    supabase.from("productos").select("id, sku, nombre, precio_venta, stock_actual").eq("activo", true).order("nombre"),
    supabase.from("clientes").select("id, nombre").eq("activo", true).order("nombre"),
  ]);
  const filas = (data ?? []) as Fila[];
  const listaClientes = (clientes ?? []) as { id: string; nombre: string }[];
  const opciones = ((productos ?? []) as { id: string; sku: string; nombre: string; precio_venta: number; stock_actual: number }[]).map(
    (p) => ({ id: p.id, sku: p.sku, nombre: p.nombre, precio: Number(p.precio_venta), stock: Number(p.stock_actual) }),
  );

  return (
    <div className="space-y-6">
      <h1 className="titulo">Ventas</h1>
      <Aviso error={sp.error} />

      <FormVenta productos={opciones} clientes={listaClientes} />

      <form className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <select name="cliente" defaultValue={sp.cliente ?? ""} className="input">
          <option value="">Todos los clientes</option>
          {listaClientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select name="tipo" defaultValue={sp.tipo ?? ""} className="input">
          <option value="">Contado y cuotas</option>
          <option value="contado">Al contado</option>
          <option value="credito">A cuotas</option>
        </select>
        <input name="desde" type="date" defaultValue={sp.desde} aria-label="Desde" className="input" />
        <input name="hasta" type="date" defaultValue={sp.hasta} aria-label="Hasta" className="input" />
        <div className="flex gap-2">
          <button className="btn-sec">Filtrar</button>
          <Link href="/ventas" className="btn-sec">Limpiar</Link>
        </div>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="tabla">
          <thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Pago</th><th>Total</th><th>Usuario</th>{admin && <th></th>}</tr></thead>
          <tbody>
            {filas.map((v) => (
              <tr key={v.id}>
                <td className="tabular-nums">#{v.numero}</td>
                <td className="whitespace-nowrap">{fechaHora(v.created_at)}</td>
                <td>{v.clientes?.nombre ?? "-"}</td>
                <td className="min-w-48">{v.venta_items.map((i) => `${cantidad(i.cantidad)}× ${i.productos?.nombre ?? "?"}`).join(", ")}</td>
                <td>
                  {v.tipo_pago === "credito" ? (
                    <Link href={`/cobranza?venta=${v.id}`} className="chip chip-alerta hover:underline">A cuotas</Link>
                  ) : (
                    <span className="chip chip-ok capitalize">{v.medio}</span>
                  )}
                </td>
                <td className="tabular-nums">{dinero(v.total)}</td>
                <td>{v.perfiles?.nombre ?? "-"}</td>
                {admin && (
                  <td>
                    <form action={eliminarVenta}>
                      <input type="hidden" name="id" value={v.id} />
                      <BotonConfirmar
                        className="btn-sec px-2 text-red-700 dark:text-red-400"
                        mensaje={`¿Eliminar la venta #${v.numero}? Se devuelve el stock y se borran sus cuotas y cobros de caja. No se puede deshacer.`}
                      >
                        <Trash size={16} /> Eliminar
                      </BotonConfirmar>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {!filas.length && <tr><td colSpan={admin ? 8 : 7} className="py-6 text-center text-zinc-600 dark:text-zinc-400">Sin ventas</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">Se muestran las últimas 200 ventas que coinciden con el filtro.</p>
    </div>
  );
}
