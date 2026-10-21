import { redirect } from "next/navigation";

// Vuelve a la ruta con un mensaje de error (redirect lanza: no usar dentro de try/catch).
export function fallar(ruta: string, mensaje: string): never {
  redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}error=${encodeURIComponent(mensaje)}`);
}

// La bodega está en Paraguay: guaraníes, formato es-PY y hora de Asunción.
export const LOCALE = "es-PY";
export const ZONA = "America/Asuncion";

export const dinero = (n: number) =>
  new Intl.NumberFormat(LOCALE, { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n);

export const cantidad = (n: number) => Number(n).toLocaleString(LOCALE, { maximumFractionDigits: 3 });

export const fechaHora = (s: string) => new Date(s).toLocaleString(LOCALE, { timeZone: ZONA });

export const MEDIOS = ["efectivo", "transferencia", "tarjeta"] as const;
// shortcut: lista fija en código; si piden editarlas desde la app, pasar a una tabla.
export const CATEGORIAS_GASTO = ["Arriendo", "Servicios básicos", "Sueldos", "Transporte", "Impuestos", "Mantención", "Retiro", "Otros"];
export const CATEGORIAS_INGRESO = ["Aporte de capital", "Otros ingresos"];

// Fecha de hoy (YYYY-MM-DD) en Paraguay, para comparar con fechas de vencimiento.
export const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: ZONA });
export const enDias = (n: number) => new Date(Date.parse(hoy()) + n * 86_400_000).toISOString().slice(0, 10);

// Días entre hoy y una fecha YYYY-MM-DD (negativo = ya pasó). Ambas se leen como medianoche UTC: la resta es exacta.
export const diasPara = (fecha: string) => Math.round((Date.parse(fecha) - Date.parse(hoy())) / 86_400_000);

export function textoVence(fecha: string) {
  const d = diasPara(fecha);
  if (d === 0) return "Vence hoy";
  if (d === 1) return "Falta 1 día";
  if (d > 1) return `Faltan ${d} días`;
  return d === -1 ? "Vencida hace 1 día" : `Vencida hace ${-d} días`;
}

// dd-mm-aaaa. Una fecha pura (YYYY-MM-DD) se muestra tal cual; un timestamp, en hora de Paraguay.
export const fecha = (s: string) =>
  (s.length > 10 ? new Date(s).toLocaleDateString("en-CA", { timeZone: ZONA }) : s).split("-").reverse().join("-");
