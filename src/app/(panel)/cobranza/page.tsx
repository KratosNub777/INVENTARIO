import Link from "next/link";
import { abonarCuota, editarCuota } from "@/actions/cuotas";
import { Aviso } from "@/components/aviso";
import { CampoDinero } from "@/components/campo-dinero";
import { EstadoCuota } from "@/components/estado-cuota";
import { getSesion } from "@/lib/auth";
import { dinero, diasPara, fecha, MEDIOS } from "@/lib/util";
import type { Cuota, Venta } from "@/types/database";
import { Calendario } from "./calendario";
import { type SP, urlCobranza } from "./url";

type VentaCredito = Pick<Venta, "id" | "numero" | "total" | "created_at"> & {
  clientes: { nombre: string; telefono: string | null } | null;
  cuotas: Cuota[];
};

export default async function Cobranza({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, perfil } = await getSesion();
  const estado = sp.estado ?? "pendientes";
  const calendario = sp.vista === "calendario";
  const { data: clientes } = await supabase.from("clientes").select("id, nombre").eq("activo", true).order("nombre");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">Cobranza</h1>
          <p className="subtitulo">Seguimiento de las ventas a cuotas.</p>
        </div>
        <div className="flex gap-2">
          <Link href={urlCobranza(sp, { vista: undefined, mes: undefined })} className={calendario ? "btn-sec" : "btn"}>Lista</Link>
          <Link href={urlCobranza(sp, { vista: "calendario", venta: undefined })} className={calendario ? "btn" : "btn-sec"}>Calendario</Link>
        </div>
      </div>
      <Aviso error={sp.error} />

      <form className="card grid gap-3 sm:grid-cols-3">
        {calendario && <input type="hidden" name="vista" value="calendario" />}
        {sp.mes && <input type="hidden" name="mes" value={sp.mes} />}
        <select name="cliente" defaultValue={sp.cliente ?? ""} className="input">
          <option value="">Todos los clientes</option>
          {((clientes ?? []) as { id: string; nombre: string }[]).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select name="estado" defaultValue={estado} className="input">
          <option value="pendientes">Con cuotas pendientes</option>
          <option value="pagadas">Pagadas</option>
          <option value="todas">Todas</option>
        </select>
        <div className="flex gap-2">
          <button className="btn-sec">Filtrar</button>
          <Link href={calendario ? "/cobranza?vista=calendario" : "/cobranza"} className="btn-sec">Limpiar</Link>
        </div>
      </form>

      {calendario ? <Calendario sp={sp} estado={estado} /> : <Lista sp={sp} estado={estado} admin={perfil.rol === "admin"} />}
    </div>
  );
}

async function Lista({ sp, estado, admin }: { sp: SP; estado: string; admin: boolean }) {
  const { supabase } = await getSesion();
  // shortcut: últimas 500 ventas a cuotas filtradas en memoria; si crecen mucho, filtrar pendientes en la base.
  let consulta = supabase
    .from("ventas")
    .select("id, numero, total, created_at, clientes(nombre, telefono), cuotas(*)")
    .eq("tipo_pago", "credito")
    .order("created_at", { ascending: false })
    .limit(500);
  if (sp.cliente) consulta = consulta.eq("cliente_id", sp.cliente);
  if (sp.venta) consulta = consulta.eq("id", sp.venta);
  const { data } = await consulta;

  const ventas = ((data ?? []) as unknown as VentaCredito[])
    .map((v) => ({ ...v, cuotas: [...v.cuotas].sort((a, b) => a.numero - b.numero) }))
    .filter((v) => estado === "todas" || v.cuotas.some((c) => !c.pagada) === (estado === "pendientes"));
  const pendientes = ventas.flatMap((v) => v.cuotas.filter((c) => !c.pagada));
  const porCobrar = pendientes.reduce((s, c) => s + Number(c.monto) - Number(c.pagado), 0);
  const vencidas = pendientes.filter((c) => diasPara(c.vence) < 0);
  const volver = urlCobranza(sp);

  return (
    <>
      <div className="escalonado grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Por cobrar</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{dinero(porCobrar)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Cuotas vencidas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{vencidas.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Monto vencido</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{dinero(vencidas.reduce((s, c) => s + Number(c.monto) - Number(c.pagado), 0))}</p>
        </div>
      </div>

      {ventas.map((v) => {
        const pagado = v.cuotas.reduce((s, c) => s + Number(c.pagado), 0);
        const total = v.cuotas.reduce((s, c) => s + Number(c.monto), 0);
        return (
          <section key={v.id} className="card space-y-3 p-0">
            <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
              <div>
                <p className="font-semibold">
                  {v.clientes?.nombre ?? "Sin cliente"}
                  {v.clientes?.telefono && <span className="font-normal text-zinc-600 dark:text-zinc-400"> · {v.clientes.telefono}</span>}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Venta #{v.numero} · compró el {fecha(v.created_at)} · termina el {v.cuotas.length ? fecha(v.cuotas[v.cuotas.length - 1].vence) : "-"}
                </p>
              </div>
              <div className="w-full max-w-56 text-sm">
                <p className="tabular-nums">Pagado {dinero(pagado)} de {dinero(total)}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${total ? Math.min(100, (pagado / total) * 100) : 0}%` }} />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="tabla">
                <thead><tr><th>Cuota</th><th>Vence</th><th>Monto</th><th>Abonado</th><th>Estado</th><th>Pago</th></tr></thead>
                <tbody>
                  {v.cuotas.map((c) => (
                    <tr key={c.id}>
                      <td className="tabular-nums">{c.numero}/{v.cuotas.length}</td>
                      <td className="whitespace-nowrap">{fecha(c.vence)}</td>
                      <td className="tabular-nums">{dinero(c.monto)}</td>
                      <td className="tabular-nums">{dinero(c.pagado)}</td>
                      <td><EstadoCuota vence={c.vence} pagada={c.pagada} /></td>
                      <td>
                        {!c.pagada && (
                          <div className="space-y-2">
                            <form action={abonarCuota} className="flex flex-wrap gap-2">
                              <input type="hidden" name="cuota_id" value={c.id} />
                              <input type="hidden" name="volver" value={volver} />
                              <CampoDinero name="monto" required placeholder="Abono" aria-label="Monto del abono" className="input w-32" />
                              <select name="medio" aria-label="Medio de pago" className="input w-36 capitalize">
                                {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <button className="btn-sec">Abonar</button>
                              <button name="todo" value="1" formNoValidate className="btn">
                                Pagar {dinero(Number(c.monto) - Number(c.pagado))}
                              </button>
                            </form>
                            {admin && (
                              <details>
                                <summary className="cursor-pointer text-xs text-zinc-600 hover:underline dark:text-zinc-400">Editar cuota</summary>
                                <form action={editarCuota} className="mt-2 flex flex-wrap gap-2">
                                  <input type="hidden" name="id" value={c.id} />
                                  <input type="hidden" name="volver" value={volver} />
                                  <CampoDinero name="monto" required defaultValue={Number(c.monto)} aria-label="Monto" className="input w-32" />
                                  <input name="vence" type="date" required defaultValue={c.vence} aria-label="Vence" className="input w-40" />
                                  <button className="btn-sec">Guardar</button>
                                </form>
                              </details>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {!ventas.length && <p className="text-sm text-zinc-600 dark:text-zinc-400">No hay ventas a cuotas con este filtro.</p>}
    </>
  );
}
