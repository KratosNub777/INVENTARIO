import Link from "next/link";
import { registrarCompra } from "@/actions/compras";
import { Aviso } from "@/components/aviso";
import { LineasProducto } from "@/components/lineas-producto";
import { getSesion } from "@/lib/auth";
import { cantidad, dinero, fechaHora, MEDIOS } from "@/lib/util";
import type { Compra } from "@/types/database";

type SP = { proveedor?: string; desde?: string; hasta?: string; error?: string };
type Fila = Compra & {
  proveedores: { nombre: string } | null;
  perfiles: { nombre: string } | null;
  compra_items: { cantidad: number; productos: { nombre: string } | null }[];
};

export default async function Compras({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await getSesion();

  let consulta = supabase
    .from("compras")
    .select("*, proveedores(nombre), perfiles(nombre), compra_items(cantidad, productos(nombre))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.proveedor) consulta = consulta.eq("proveedor_id", sp.proveedor);
  if (sp.desde) consulta = consulta.gte("created_at", sp.desde);
  if (sp.hasta) consulta = consulta.lte("created_at", `${sp.hasta}T23:59:59`);

  const [{ data }, { data: productos }, { data: proveedores }] = await Promise.all([
    consulta,
    supabase.from("productos").select("id, sku, nombre, precio_costo").eq("activo", true).order("nombre"),
    supabase.from("proveedores").select("id, nombre").order("nombre"),
  ]);
  const filas = (data ?? []) as Fila[];
  const listaProveedores = (proveedores ?? []) as { id: string; nombre: string }[];
  const opciones = ((productos ?? []) as { id: string; sku: string; nombre: string; precio_costo: number }[]).map(
    (p) => ({ id: p.id, sku: p.sku, nombre: p.nombre, precio: Number(p.precio_costo) }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo">Compras</h1>
        <p className="subtitulo">Mercadería comprada por la bodega. Suma stock, actualiza el costo y descuenta de caja.</p>
      </div>
      <Aviso error={sp.error} />

      <form action={registrarCompra} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className="label">Proveedor (opcional)</span>
            <select name="proveedor_id" defaultValue="" className="input">
              <option value="">Sin proveedor</option>
              {listaProveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Medio de pago</span>
            <select name="medio" className="input capitalize">
              {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Nota (N° factura, etc.)</span>
            <input name="nota" className="input" />
          </label>
        </div>
        <LineasProducto productos={opciones} etiquetaPrecio="Costo unitario" />
        <button className="btn">Registrar compra</button>
      </form>

      <form className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <select name="proveedor" defaultValue={sp.proveedor ?? ""} className="input">
          <option value="">Todos los proveedores</option>
          {listaProveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input name="desde" type="date" defaultValue={sp.desde} aria-label="Desde" className="input" />
        <input name="hasta" type="date" defaultValue={sp.hasta} aria-label="Hasta" className="input" />
        <div className="flex gap-2">
          <button className="btn-sec">Filtrar</button>
          <Link href="/compras" className="btn-sec">Limpiar</Link>
        </div>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="tabla">
          <thead><tr><th>N°</th><th>Fecha</th><th>Proveedor</th><th>Productos</th><th>Medio</th><th>Total</th><th>Nota</th><th>Usuario</th></tr></thead>
          <tbody>
            {filas.map((c) => (
              <tr key={c.id}>
                <td className="tabular-nums">#{c.numero}</td>
                <td className="whitespace-nowrap">{fechaHora(c.created_at)}</td>
                <td>{c.proveedores?.nombre ?? "-"}</td>
                <td className="min-w-48">{c.compra_items.map((i) => `${cantidad(i.cantidad)}× ${i.productos?.nombre ?? "?"}`).join(", ")}</td>
                <td className="capitalize">{c.medio}</td>
                <td className="tabular-nums">{dinero(c.total)}</td>
                <td>{c.nota ?? "-"}</td>
                <td>{c.perfiles?.nombre ?? "-"}</td>
              </tr>
            ))}
            {!filas.length && <tr><td colSpan={8} className="py-6 text-center text-zinc-600 dark:text-zinc-400">Sin compras</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">Se muestran las últimas 200 compras que coinciden con el filtro.</p>
    </div>
  );
}
