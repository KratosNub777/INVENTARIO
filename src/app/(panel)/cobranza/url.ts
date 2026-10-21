export type SP = { cliente?: string; venta?: string; estado?: string; vista?: string; mes?: string; error?: string };

// Arma la URL de cobranza conservando los filtros actuales (sin el error).
export function urlCobranza(sp: SP, cambios: Partial<SP> = {}) {
  const params = Object.entries({ ...sp, ...cambios }).filter(([k, v]) => v && k !== "error") as [string, string][];
  return `/cobranza${params.length ? `?${new URLSearchParams(params)}` : ""}`;
}
