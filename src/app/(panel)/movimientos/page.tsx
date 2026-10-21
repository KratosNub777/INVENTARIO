import Link from "next/link";
import { registrarMovimiento } from "@/actions/movimientos";
import { Aviso } from "@/components/aviso";
import { getSesion } from "@/lib/auth";
import { cantidad, fechaHora } from "@/lib/util";
import type { Movimiento, Perfil, Producto } from "@/types/database";

type SP = { producto?: string; tipo?: string; usuario?: string; desde?: string; hasta?: string; error?: string };
type Fila = Movimiento & { productos: { sku: string; nombre: string } | null; perfiles: { nombre: string } | null };

export default async function Movimientos({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await getSesion();

  let consulta = supabase
    .from("movimientos")
    .select("*, productos(sku, nombre), perfiles(nombre)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.producto) consulta = consulta.eq("producto_id", sp.producto);
  if (sp.tipo) consulta = consulta.eq("tipo", sp.tipo);
  if (sp.usuario) consulta = consulta.eq("usuario_id", sp.usuario);
  if (sp.desde) consulta = consulta.gte("created_at", sp.desde);
  if (sp.hasta) consulta = consulta.lte("created_at", `${sp.hasta}T23:59:59`);

  const [{ data }, { data: productos }, { data: usuarios }] = await Promise.all([
    consulta,
    supabase.from("productos").select("id, sku, nombre, unidad").eq("activo", true).order("nombre"),
    supabase.from("perfiles").select("id, nombre").order("nombre"),
  ]);
  const filas = (data ?? []) as Fila[];
  const lista = (productos ?? []) as Pick<Producto, "id" | "sku" | "nombre" | "unidad">[];

  return (
    <div className="space-y-4">
      <h1 className="titulo">Movimientos</h1>
      <Aviso error={sp.error} />

      <form action={registrarMovimiento} className="card grid gap-x-4 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-12">
        <label className="sm:col-span-2 lg:col-span-4">
          <span className="label">Producto</span>
          <select name="producto_id" required defaultValue={sp.producto ?? ""} className="input">
            <option value="" disabled>Elige un producto</option>
            {lista.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.nombre}</option>)}
          </select>
        </label>
        <label className="lg:col-span-2">
          <span className="label">Tipo</span>
          <select name="tipo" className="input">
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </label>
        <label className="lg:col-span-2">
          <span className="label">Cantidad</span>
          <input name="cantidad" type="number" min="0" step="any" required className="input" />
        </label>
        <label className="sm:col-span-2 lg:col-span-4">
          <span className="label">Motivo</span>
          <input name="motivo" placeholder="Opcional" className="input" />
        </label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-2 lg:col-span-12">
          <button className="btn">Registrar movimiento</button>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Entrada: compra o reposición. Salida: venta o uso. Ajuste: la cantidad es el stock contado.
          </p>
        </div>
      </form>

      <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <select name="producto" defaultValue={sp.producto ?? ""} className="input">
          <option value="">Todos los productos</option>
          {lista.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select name="tipo" defaultValue={sp.tipo ?? ""} className="input">
          <option value="">Todos los tipos</option>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
          <option value="ajuste">Ajuste</option>
        </select>
        <select name="usuario" defaultValue={sp.usuario ?? ""} className="input">
          <option value="">Todos los usuarios</option>
          {((usuarios ?? []) as Pick<Perfil, "id" | "nombre">[]).map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        <input name="desde" type="date" defaultValue={sp.desde} aria-label="Desde" className="input" />
        <input name="hasta" type="date" defaultValue={sp.hasta} aria-label="Hasta" className="input" />
        <div className="flex gap-2">
          <button className="btn-sec">Filtrar</button>
          <Link href="/movimientos" className="btn-sec">Limpiar</Link>
        </div>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock</th><th>Motivo</th><th>Usuario</th></tr></thead>
          <tbody>
            {filas.map((m) => (
              <tr key={m.id}>
                <td>{fechaHora(m.created_at)}</td>
                <td>{m.productos ? `${m.productos.sku} · ${m.productos.nombre}` : "-"}</td>
                <td className="capitalize">{m.tipo}</td>
                <td>{m.tipo === "ajuste" && m.cantidad > 0 ? "+" : ""}{cantidad(m.cantidad)}</td>
                <td>{cantidad(m.stock_anterior)} → {cantidad(m.stock_nuevo)}</td>
                <td>{m.motivo ?? "-"}</td>
                <td>{m.perfiles?.nombre ?? "-"}</td>
              </tr>
            ))}
            {!filas.length && <tr><td colSpan={7} className="py-6 text-center text-zinc-600 dark:text-zinc-400">Sin movimientos</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">Se muestran los últimos 200 movimientos que coinciden con el filtro.</p>
    </div>
  );
}
