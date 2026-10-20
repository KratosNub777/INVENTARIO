import { redirect } from "next/navigation";

// Vuelve a la ruta con un mensaje de error (redirect lanza: no usar dentro de try/catch).
export function fallar(ruta: string, mensaje: string): never {
  redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}error=${encodeURIComponent(mensaje)}`);
}

export const dinero = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export const cantidad = (n: number) => Number(n).toLocaleString("es-CL", { maximumFractionDigits: 3 });

export const fechaHora = (s: string) => new Date(s).toLocaleString("es-CL");
