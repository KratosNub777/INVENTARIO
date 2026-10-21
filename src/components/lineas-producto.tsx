"use client";

import { useEffect, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { dinero } from "@/lib/util";

export type OpcionProducto = { id: string; sku: string; nombre: string; precio: number; stock?: number };
type Linea = { producto_id: string; cantidad: string; precio: string };

const vacia = (): Linea => ({ producto_id: "", cantidad: "1", precio: "" });

// Filas producto + cantidad + precio. Se envían como JSON en el input oculto "items".
export function LineasProducto({
  productos,
  etiquetaPrecio = "Precio unitario",
  onTotal,
}: {
  productos: OpcionProducto[];
  etiquetaPrecio?: string;
  onTotal?: (total: number) => void;
}) {
  const [lineas, setLineas] = useState<Linea[]>([vacia()]);
  const total = lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio || 0), 0);
  useEffect(() => onTotal?.(total), [total, onTotal]);

  const cambiar = (i: number, campo: keyof Linea, valor: string) =>
    setLineas((ls) =>
      ls.map((l, j) => {
        if (j !== i) return l;
        const nueva = { ...l, [campo]: valor };
        // Al elegir producto se propone su precio; el usuario puede cambiarlo.
        if (campo === "producto_id") nueva.precio = String(productos.find((p) => p.id === valor)?.precio ?? "");
        return nueva;
      }),
    );

  const items = lineas.map((l) => ({ producto_id: l.producto_id, cantidad: Number(l.cantidad), precio: Number(l.precio) }));

  return (
    <div className="space-y-2">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      {lineas.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_7rem_9rem_auto]">
          <select
            value={l.producto_id}
            onChange={(e) => cambiar(i, "producto_id", e.target.value)}
            required
            aria-label="Producto"
            className="input col-span-2 sm:col-span-1"
          >
            <option value="" disabled>Elige un producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.nombre}{p.stock !== undefined ? ` (stock ${p.stock})` : ""}
              </option>
            ))}
          </select>
          <input
            type="number" min="0" step="any" required value={l.cantidad}
            onChange={(e) => cambiar(i, "cantidad", e.target.value)}
            aria-label="Cantidad" placeholder="Cantidad" className="input"
          />
          <input
            type="number" min="0" step="any" required value={l.precio}
            onChange={(e) => cambiar(i, "precio", e.target.value)}
            aria-label={etiquetaPrecio} placeholder={etiquetaPrecio} className="input"
          />
          <button
            type="button"
            onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : [vacia()]))}
            aria-label="Quitar línea"
            className="btn-sec px-2"
          >
            <Trash size={18} />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setLineas((ls) => [...ls, vacia()])} className="btn-sec">
          <Plus size={16} /> Agregar producto
        </button>
        <p className="text-sm">Total productos: <span className="font-semibold tabular-nums">{dinero(total)}</span></p>
      </div>
    </div>
  );
}
