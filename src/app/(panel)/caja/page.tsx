import Link from "next/link";
import { abrirCaja, cerrarCaja, registrarMovimientoCaja } from "@/actions/caja";
import { Aviso } from "@/components/aviso";
import { getSesion } from "@/lib/auth";
import { CATEGORIAS_GASTO, CATEGORIAS_INGRESO, dinero, fechaHora, hoy, MEDIOS } from "@/lib/util";
import type { Caja as CajaDia, MovimientoCaja } from "@/types/database";

type SP = { desde?: string; hasta?: string; tipo?: string; medio?: string; error?: string };
type Fila = MovimientoCaja & { perfiles: { nombre: string } | null };

const suma = (movs: MovimientoCaja[], tipo: "ingreso" | "egreso") =>
  movs.filter((m) => m.tipo === tipo).reduce((s, m) => s + Number(m.monto), 0);

export default async function Caja({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await getSesion();
  const desde = sp.desde ?? `${hoy().slice(0, 7)}-01`;
  const hasta = sp.hasta ?? hoy();

  // shortcut: el resumen suma en memoria hasta 2000 movimientos del período; si crece, pasar a una vista agregada.
  let consulta = supabase
    .from("caja_movimientos")
    .select("*, perfiles(nombre)")
    .gte("created_at", desde)
    .lte("created_at", `${hasta}T23:59:59`)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (sp.tipo) consulta = consulta.eq("tipo", sp.tipo);
  if (sp.medio) consulta = consulta.eq("medio", sp.medio);

  const [{ data }, { data: saldos }, { data: abierta }, { data: cierres }] = await Promise.all([
    consulta,
    supabase.from("v_saldo_caja").select("*"),
    supabase.from("cajas").select("*").is("cerrada_at", null).maybeSingle(),
    supabase.from("cajas").select("*").not("cerrada_at", "is", null).order("cerrada_at", { ascending: false }).limit(10),
  ]);
  const movs = (data ?? []) as Fila[];
  const saldo = new Map(((saldos ?? []) as { medio: string; saldo: number }[]).map((s) => [s.medio, Number(s.saldo)]));
  const caja = abierta as CajaDia | null;

  // Efectivo esperado en la caja abierta (misma cuenta que cerrar_caja en la base).
  let esperado = 0;
  if (caja) {
    const { data: efectivo } = await supabase
      .from("caja_movimientos")
      .select("tipo, monto")
      .eq("medio", "efectivo")
      .gte("created_at", caja.abierta_at);
    esperado = Number(caja.monto_inicial) + suma((efectivo ?? []) as MovimientoCaja[], "ingreso") - suma((efectivo ?? []) as MovimientoCaja[], "egreso");
  }

  const ingresos = suma(movs, "ingreso");
  const egresos = suma(movs, "egreso");
  const porCategoria = [...movs.filter((m) => m.tipo === "egreso").reduce(
    (mapa, m) => mapa.set(m.categoria, (mapa.get(m.categoria) ?? 0) + Number(m.monto)),
    new Map<string, number>(),
  )].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo">Caja</h1>
        <p className="subtitulo">Ventas al contado, cuotas cobradas y compras entran solas. Aquí registras el resto.</p>
      </div>
      <Aviso error={sp.error} />

      <div className="escalonado grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MEDIOS.map((m) => (
          <div key={m} className="card">
            <p className="text-sm capitalize text-zinc-600 dark:text-zinc-400">Saldo {m}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{dinero(saldo.get(m) ?? 0)}</p>
          </div>
        ))}
        <div className="card">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Saldo total</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{dinero([...saldo.values()].reduce((s, v) => s + v, 0))}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-semibold">Caja del día</h2>
          {caja ? (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Abierta el {fechaHora(caja.abierta_at)} con {dinero(caja.monto_inicial)}.
              </p>
              <p>Efectivo esperado ahora: <span className="font-semibold tabular-nums">{dinero(esperado)}</span></p>
              <form action={cerrarCaja} className="flex flex-wrap items-end gap-2">
                <label className="flex-1">
                  <span className="label">Efectivo contado al cerrar</span>
                  <input name="monto" type="number" min="0" step="1" required className="input" />
                </label>
                <button className="btn">Cerrar caja</button>
              </form>
            </>
          ) : (
            <form action={abrirCaja} className="flex flex-wrap items-end gap-2">
              <label className="flex-1">
                <span className="label">Efectivo inicial en la caja</span>
                <input name="monto" type="number" min="0" step="1" required className="input" />
              </label>
              <button className="btn">Abrir caja</button>
            </form>
          )}
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Registrar ingreso o gasto</h2>
          <form action={registrarMovimientoCaja} className="grid gap-3 sm:grid-cols-2">
            <select name="tipo" aria-label="Tipo" className="input">
              <option value="egreso">Gasto / egreso</option>
              <option value="ingreso">Ingreso</option>
            </select>
            <input name="monto" type="number" min="1" step="1" required placeholder="Monto" aria-label="Monto" className="input" />
            <select name="medio" aria-label="Medio de pago" className="input capitalize">
              {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select name="categoria" required defaultValue="" aria-label="Categoría" className="input">
              <option value="" disabled>Categoría</option>
              <optgroup label="Gastos">{CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}</optgroup>
              <optgroup label="Ingresos">{CATEGORIAS_INGRESO.map((c) => <option key={c}>{c}</option>)}</optgroup>
            </select>
            <input name="concepto" placeholder="Detalle (opcional)" aria-label="Detalle" className="input sm:col-span-2" />
            <button className="btn sm:col-span-2">Registrar</button>
          </form>
        </section>
      </div>

      <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input name="desde" type="date" defaultValue={desde} aria-label="Desde" className="input" />
        <input name="hasta" type="date" defaultValue={hasta} aria-label="Hasta" className="input" />
        <select name="tipo" defaultValue={sp.tipo ?? ""} className="input">
          <option value="">Ingresos y egresos</option>
          <option value="ingreso">Ingresos</option>
          <option value="egreso">Egresos</option>
        </select>
        <select name="medio" defaultValue={sp.medio ?? ""} className="input capitalize">
          <option value="">Todos los medios</option>
          {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex gap-2">
          <button className="btn-sec">Filtrar</button>
          <Link href="/caja" className="btn-sec">Este mes</Link>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card space-y-2">
          <h2 className="font-semibold">Resumen del período</h2>
          <p className="flex justify-between text-sm">Ingresos <span className="tabular-nums text-emerald-800 dark:text-emerald-300">{dinero(ingresos)}</span></p>
          <p className="flex justify-between text-sm">Egresos <span className="tabular-nums text-red-800 dark:text-red-300">{dinero(egresos)}</span></p>
          <p className="flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">Resultado <span className="tabular-nums">{dinero(ingresos - egresos)}</span></p>
        </section>
        <section className="card space-y-3 lg:col-span-2">
          <h2 className="font-semibold">¿En qué se fue la plata?</h2>
          {porCategoria.length ? (
            porCategoria.map(([cat, monto]) => (
              <div key={cat} className="space-y-1 text-sm">
                <p className="flex justify-between">{cat} <span className="tabular-nums">{dinero(monto)}</span></p>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(monto / egresos) * 100}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Sin egresos en el período.</p>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Movimientos de caja</h2>
        <div className="card overflow-x-auto p-0">
          <table className="tabla">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Detalle</th><th>Medio</th><th>Monto</th><th>Usuario</th></tr></thead>
            <tbody>
              {movs.slice(0, 200).map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{fechaHora(m.created_at)}</td>
                  <td><span className={`chip capitalize ${m.tipo === "ingreso" ? "chip-ok" : "chip-alerta"}`}>{m.tipo}</span></td>
                  <td>{m.categoria}</td>
                  <td>{m.concepto ?? "-"}</td>
                  <td className="capitalize">{m.medio}</td>
                  <td className="tabular-nums">{m.tipo === "egreso" ? "-" : ""}{dinero(m.monto)}</td>
                  <td>{m.perfiles?.nombre ?? "-"}</td>
                </tr>
              ))}
              {!movs.length && <tr><td colSpan={7} className="py-6 text-center text-zinc-600 dark:text-zinc-400">Sin movimientos en el período</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Se muestran hasta 200 movimientos. Para corregir un error, registra el movimiento contrario.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Últimos cierres</h2>
        <div className="card overflow-x-auto p-0">
          <table className="tabla">
            <thead><tr><th>Apertura</th><th>Cierre</th><th>Inicial</th><th>Esperado</th><th>Contado</th><th>Diferencia</th></tr></thead>
            <tbody>
              {((cierres ?? []) as CajaDia[]).map((c) => (
                <tr key={c.id}>
                  <td className="whitespace-nowrap">{fechaHora(c.abierta_at)}</td>
                  <td className="whitespace-nowrap">{c.cerrada_at ? fechaHora(c.cerrada_at) : "-"}</td>
                  <td className="tabular-nums">{dinero(c.monto_inicial)}</td>
                  <td className="tabular-nums">{dinero(c.esperado ?? 0)}</td>
                  <td className="tabular-nums">{dinero(c.contado ?? 0)}</td>
                  <td>
                    <span className={`chip tabular-nums ${Number(c.diferencia) === 0 ? "chip-ok" : "chip-alerta"}`}>
                      {Number(c.diferencia) > 0 ? "+" : ""}{dinero(c.diferencia ?? 0)}
                    </span>
                  </td>
                </tr>
              ))}
              {!cierres?.length && <tr><td colSpan={6} className="py-6 text-center text-zinc-600 dark:text-zinc-400">Aún no hay cierres</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
