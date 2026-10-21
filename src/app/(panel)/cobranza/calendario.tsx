import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getSesion } from "@/lib/auth";
import { dinero, diasPara, hoy } from "@/lib/util";
import type { Cuota } from "@/types/database";
import { type SP, urlCobranza } from "./url";

type Fila = Cuota & { ventas: { id: string; numero: number; clientes: { nombre: string } | null } };

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const mesValido = (m?: string) => (m && /^\d{4}-\d{2}$/.test(m) ? m : hoy().slice(0, 7));
const desplazar = (a: number, m: number, delta: number) => new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);

// Grilla mensual (lunes a domingo) con las cuotas de cada día.
export async function Calendario({ sp, estado }: { sp: SP; estado: string }) {
  const { supabase } = await getSesion();
  const mes = mesValido(sp.mes);
  const [a, m] = mes.split("-").map(Number);
  const diasMes = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7;

  let consulta = supabase
    .from("cuotas")
    .select("*, ventas!inner(id, numero, cliente_id, clientes(nombre))")
    .gte("vence", `${mes}-01`)
    .lte("vence", `${mes}-${String(diasMes).padStart(2, "0")}`)
    .order("vence");
  if (sp.cliente) consulta = consulta.eq("ventas.cliente_id", sp.cliente);
  if (estado !== "todas") consulta = consulta.eq("pagada", estado === "pagadas");
  const { data } = await consulta;
  const cuotas = (data ?? []) as Fila[];

  const porDia = new Map<number, Fila[]>();
  for (const c of cuotas) {
    const d = Number(c.vence.slice(8, 10));
    porDia.set(d, [...(porDia.get(d) ?? []), c]);
  }
  const celdas = [...Array(offset).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  const titulo = new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
  const hoyStr = hoy();

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Link href={urlCobranza(sp, { mes: desplazar(a, m, -1) })} aria-label="Mes anterior" className="btn-sec px-2"><CaretLeft size={18} /></Link>
        <p className="font-semibold capitalize">{titulo}</p>
        <Link href={urlCobranza(sp, { mes: desplazar(a, m, 1) })} aria-label="Mes siguiente" className="btn-sec px-2"><CaretRight size={18} /></Link>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[42rem] grid-cols-7 gap-1 text-xs">
          {DIAS.map((d) => <div key={d} className="px-1 py-1 font-semibold text-zinc-600 dark:text-zinc-400">{d}</div>)}
          {celdas.map((dia, i) => {
            const fechaDia = dia && `${mes}-${String(dia).padStart(2, "0")}`;
            return (
              <div
                key={i}
                className={`min-h-24 rounded-lg border p-1 ${
                  !dia
                    ? "border-transparent"
                    : fechaDia === hoyStr
                      ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30"
                      : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {dia && <p className="mb-1 font-medium tabular-nums">{dia}</p>}
                <div className="space-y-1">
                  {dia &&
                    (porDia.get(dia) ?? []).map((c) => {
                      const color = c.pagada
                        ? "chip-ok"
                        : diasPara(c.vence) < 0
                          ? "chip-alerta"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
                      return (
                        <Link
                          key={c.id}
                          href={`/cobranza?venta=${c.ventas.id}&estado=todas`}
                          title={`Venta #${c.ventas.numero} · cuota ${c.numero}`}
                          className={`block truncate rounded px-1 py-0.5 hover:underline ${color}`}
                        >
                          {c.ventas.clientes?.nombre ?? "?"} · {dinero(c.pagada ? c.monto : Number(c.monto) - Number(c.pagado))}
                        </Link>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {cuotas.length} cuota(s) este mes. Toca una para ver la venta y registrar el pago.
      </p>
    </div>
  );
}
