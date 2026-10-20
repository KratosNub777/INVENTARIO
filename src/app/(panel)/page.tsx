import Link from "next/link";
import { ArrowsLeftRight, CheckCircle, CurrencyDollar, Package, Tag, Warning } from "@phosphor-icons/react/dist/ssr";
import { Aviso } from "@/components/aviso";
import { Contador } from "@/components/contador";
import { Vacio } from "@/components/vacio";
import { getSesion } from "@/lib/auth";
import { cantidad, fechaHora } from "@/lib/util";
import type { Movimiento } from "@/types/database";

type Resumen = { total_productos: number; valor_costo: number; valor_venta: number };
type Bajo = { id: string; sku: string; nombre: string; unidad: string; stock_actual: number; stock_minimo: number };
type Fila = Movimiento & { productos: { nombre: string } | null; perfiles: { nombre: string } | null };

const colorTipo = { entrada: "chip-ok", salida: "chip-alerta", ajuste: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase, perfil } = await getSesion();
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
  const movimientos = (movs ?? []) as Fila[];

  const tarjetas = [
    { titulo: "Productos activos", valor: r.total_productos, Icono: Package, moneda: false, alerta: false },
    { titulo: "Valor a costo", valor: Number(r.valor_costo), Icono: CurrencyDollar, moneda: true, alerta: false },
    { titulo: "Valor a precio de venta", valor: Number(r.valor_venta), Icono: Tag, moneda: true, alerta: false },
    { titulo: "Con stock bajo", valor: stockBajo.length, Icono: Warning, moneda: false, alerta: stockBajo.length > 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="titulo">Hola, {perfil.nombre}</h1>
        <p className="subtitulo">Resumen de tu inventario.</p>
      </div>
      <Aviso error={error} />

      <div className="escalonado grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map(({ titulo, valor, Icono, moneda, alerta }) => (
          <div key={titulo} className="card flex items-start justify-between gap-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="min-w-0">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{titulo}</p>
              <p className="mt-1 truncate text-2xl font-semibold tracking-tight tabular-nums">
                <Contador valor={valor} moneda={moneda} />
              </p>
            </div>
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                alerta
                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              <Icono size={22} weight="duotone" />
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-semibold">Stock bajo</h2>
          <div className="card overflow-x-auto p-0">
            {stockBajo.length ? (
              <table className="tabla">
                <thead><tr><th>Producto</th><th>Stock</th><th>Mínimo</th></tr></thead>
                <tbody>
                  {stockBajo.slice(0, 8).map((p) => (
                    <tr key={p.id}>
                      <td><Link href={`/productos/${p.id}`} className="font-medium hover:underline">{p.nombre}</Link></td>
                      <td><span className="chip chip-alerta tabular-nums">{cantidad(p.stock_actual)} {p.unidad}</span></td>
                      <td className="tabular-nums">{cantidad(p.stock_minimo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Vacio icono={<CheckCircle size={24} weight="duotone" />} titulo="Todo en orden" texto="Ningún producto está bajo su stock mínimo." />
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Últimos movimientos</h2>
          <div className="card overflow-x-auto p-0">
            {movimientos.length ? (
              <table className="tabla">
                <thead><tr><th>Producto</th><th>Tipo</th><th>Cant.</th><th>Fecha</th></tr></thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id}>
                      <td className="font-medium">{m.productos?.nombre ?? "Sin producto"}</td>
                      <td><span className={`chip capitalize ${colorTipo[m.tipo]}`}>{m.tipo}</span></td>
                      <td className="tabular-nums">{m.tipo === "ajuste" && m.cantidad > 0 ? "+" : ""}{cantidad(m.cantidad)}</td>
                      <td className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">{fechaHora(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Vacio
                icono={<ArrowsLeftRight size={24} weight="duotone" />}
                titulo="Aún no hay movimientos"
                texto="Registra una entrada o salida para ver la actividad aquí."
                href="/movimientos"
                accion="Registrar movimiento"
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
