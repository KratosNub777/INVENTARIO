import Link from "next/link";
import { Aviso } from "@/components/aviso";
import { getSesion } from "@/lib/auth";
import { cantidad, dinero, fechaHora } from "@/lib/util";
import type { Movimiento } from "@/types/database";

type Resumen = { total_productos: number; valor_costo: number; valor_venta: number };
type Bajo = { id: string; sku: string; nombre: string; unidad: string; stock_actual: number; stock_minimo: number };
type Fila = Movimiento & { productos: { nombre: string } | null; perfiles: { nombre: string } | null };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase } = await getSesion();
  const [{ data: resumen }, { data: bajos }, { data: movs }] = await Promise.all([
    supabase.from("v_valor_inventario").select("*").single(),
    supabase.from("v_stock_bajo").select("*"),
    supabase
      .from("movimientos")
      .select("*, productos(nombre), perfiles(nombre)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const r = (resumen ?? { total_productos: 0, valor_costo: 0, valor_venta: 0 }) as Resumen;
  const stockBajo = (bajos ?? []) as Bajo[];

  const tarjetas: [string, string][] = [
    ["Productos activos", String(r.total_productos)],
    ["Valor a costo", dinero(Number(r.valor_costo))],
    ["Valor a precio de venta", dinero(Number(r.valor_venta))],
    ["Con stock bajo", String(stockBajo.length)],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <Aviso error={error} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map(([titulo, valor]) => (
          <div key={titulo} className="card">
            <p className="text-sm text-slate-500">{titulo}</p>
            <p className="text-2xl font-semibold">{valor}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-semibold">Stock bajo</h2>
          <div className="card overflow-x-auto p-0">
            <table className="tabla">
              <thead><tr><th>Producto</th><th>Stock</th><th>Mínimo</th></tr></thead>
              <tbody>
                {stockBajo.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/productos/${p.id}`} className="underline">{p.nombre}</Link></td>
                    <td className="text-red-600">{cantidad(p.stock_actual)} {p.unidad}</td>
                    <td>{cantidad(p.stock_minimo)}</td>
                  </tr>
                ))}
                {!stockBajo.length && <tr><td colSpan={3} className="py-6 text-center text-slate-500">Todo en orden</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Últimos movimientos</h2>
          <div className="card overflow-x-auto p-0">
            <table className="tabla">
              <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cant.</th></tr></thead>
              <tbody>
                {((movs ?? []) as Fila[]).map((m) => (
                  <tr key={m.id}>
                    <td>{fechaHora(m.created_at)}</td>
                    <td>{m.productos?.nombre ?? "—"}</td>
                    <td className="capitalize">{m.tipo}</td>
                    <td>{m.tipo === "ajuste" && m.cantidad > 0 ? "+" : ""}{cantidad(m.cantidad)}</td>
                  </tr>
                ))}
                {!movs?.length && <tr><td colSpan={4} className="py-6 text-center text-slate-500">Sin movimientos</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
