"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { registrarVenta } from "@/actions/ventas";
import { LineasProducto, type OpcionProducto } from "@/components/lineas-producto";
import { dinero, fecha, hoy, MEDIOS } from "@/lib/util";

type CuotaForm = { monto: string; vence: string };

// Suma meses a una fecha YYYY-MM-DD; si el día no existe en ese mes, usa el último (31 ene + 1 = 28/29 feb).
function sumarMeses(base: string, meses: number) {
  const [a, m, d] = base.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m + meses, 0)).getUTCDate();
  return new Date(Date.UTC(a, m - 1 + meses, Math.min(d, ultimo))).toISOString().slice(0, 10);
}

// Reparte el total en partes iguales en pesos enteros; la última cuota absorbe el redondeo.
function repartir(total: number, n: number, primera: string): CuotaForm[] {
  if (!(total > 0) || !(n >= 1) || !primera) return [];
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => ({
    monto: String(i === n - 1 ? total - base * (n - 1) : base),
    vence: sumarMeses(primera, i),
  }));
}

export function FormVenta({ productos, clientes }: { productos: OpcionProducto[]; clientes: { id: string; nombre: string }[] }) {
  const [tipo, setTipo] = useState<"contado" | "credito">("contado");
  const [totalProductos, setTotalProductos] = useState(0);
  const [totalCredito, setTotalCredito] = useState("");
  const [n, setN] = useState("3");
  const [primera, setPrimera] = useState(() => sumarMeses(hoy(), 1));
  const [cuotas, setCuotas] = useState<CuotaForm[]>([]);
  const onTotal = useCallback((t: number) => setTotalProductos(t), []);

  const regenerar = (t: string, cant: string, f: string) => setCuotas(repartir(Number(t), Number(cant), f));
  const credito = tipo === "credito";
  const sumaCuotas = cuotas.reduce((s, c) => s + Number(c.monto || 0), 0);
  const ultima = cuotas.map((c) => c.vence).filter(Boolean).sort().at(-1);

  return (
    <form action={registrarVenta} className="card space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <span className="label">Cliente {credito ? "*" : "(opcional)"}</span>
          <select name="cliente_id" defaultValue="" required={credito} className="input">
            <option value="">Sin cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <Link href="/clientes" className="mt-1 inline-block text-xs text-emerald-800 hover:underline dark:text-emerald-300">+ Nuevo cliente</Link>
        </label>
        <fieldset>
          <legend className="label">Forma de pago</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["contado", "credito"] as const).map((t) => (
              <label key={t} className={`btn-sec cursor-pointer ${tipo === t ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : ""}`}>
                <input
                  type="radio" name="tipo_pago" value={t} checked={tipo === t} className="sr-only"
                  onChange={() => {
                    setTipo(t);
                    if (t === "credito" && !totalCredito && totalProductos > 0) {
                      setTotalCredito(String(totalProductos));
                      regenerar(String(totalProductos), n, primera);
                    }
                  }}
                />
                {t === "contado" ? "Al contado" : "A cuotas"}
              </label>
            ))}
          </div>
        </fieldset>
        {!credito && (
          <label>
            <span className="label">Medio de pago</span>
            <select name="medio" className="input capitalize">
              {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        )}
      </div>

      <LineasProducto productos={productos} onTotal={onTotal} />

      {credito && (
        <div className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <input type="hidden" name="cuotas" value={JSON.stringify(cuotas.map((c) => ({ monto: Number(c.monto), vence: c.vence })))} />
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className="label">Precio total a cuotas (con interés)</span>
              <input
                type="number" min="1" step="1" required value={totalCredito} className="input"
                onChange={(e) => { setTotalCredito(e.target.value); regenerar(e.target.value, n, primera); }}
              />
            </label>
            <label>
              <span className="label">Número de cuotas (mensuales)</span>
              <input
                type="number" min="1" max="60" step="1" required value={n} className="input"
                onChange={(e) => { setN(e.target.value); regenerar(totalCredito, e.target.value, primera); }}
              />
            </label>
            <label>
              <span className="label">Vence la primera cuota</span>
              <input
                type="date" required value={primera} className="input"
                onChange={(e) => { setPrimera(e.target.value); regenerar(totalCredito, n, e.target.value); }}
              />
            </label>
          </div>

          {cuotas.length > 0 && (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Compra el {fecha(hoy())} · termina de pagar el {ultima ? fecha(ultima) : "-"} · puedes ajustar cada cuota.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {cuotas.map((c, i) => (
                  <div key={i} className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">{i + 1}.</span>
                    <input
                      type="number" min="1" step="1" required value={c.monto} aria-label={`Monto cuota ${i + 1}`} className="input"
                      onChange={(e) => setCuotas((cs) => cs.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x)))}
                    />
                    <input
                      type="date" required value={c.vence} aria-label={`Vencimiento cuota ${i + 1}`} className="input"
                      onChange={(e) => setCuotas((cs) => cs.map((x, j) => (j === i ? { ...x, vence: e.target.value } : x)))}
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm">
                Total a cuotas: <span className="font-semibold tabular-nums">{dinero(sumaCuotas)}</span>
                {totalProductos > 0 && sumaCuotas !== totalProductos && (
                  <span className="text-zinc-600 dark:text-zinc-400"> (productos {dinero(totalProductos)}, diferencia {dinero(sumaCuotas - totalProductos)})</span>
                )}
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1">
          <span className="label">Nota</span>
          <input name="nota" className="input" />
        </label>
        <button className="btn">Registrar venta</button>
      </div>
    </form>
  );
}
