import { diasPara, textoVence } from "@/lib/util";

// Pagada (verde), vencida (rojo), vence en 7 días o menos (ámbar), al día (neutro).
export function EstadoCuota({ vence, pagada }: { vence: string; pagada: boolean }) {
  if (pagada) return <span className="chip chip-ok">Pagada</span>;
  const d = diasPara(vence);
  const color =
    d < 0
      ? "chip-alerta"
      : d <= 7
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  return <span className={`chip whitespace-nowrap ${color}`}>{textoVence(vence)}</span>;
}
