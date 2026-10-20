import Link from "next/link";
import { notFound } from "next/navigation";
import { actualizarProducto, desactivarProducto } from "@/actions/productos";
import { Aviso } from "@/components/aviso";
import { FormProducto } from "@/components/form-producto";
import { getSesion } from "@/lib/auth";
import { cantidad, fechaHora } from "@/lib/util";
import type { Categoria, Movimiento, Producto, Proveedor } from "@/types/database";

export default async function DetalleProducto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, perfil } = await getSesion();

  const [{ data: producto }, { data: categorias }, { data: proveedores }, { data: movs }] = await Promise.all([
    supabase.from("productos").select("*").eq("id", id).eq("activo", true).maybeSingle(),
    supabase.from("categorias").select("*").order("nombre"),
    supabase.from("proveedores").select("*").order("nombre"),
    supabase
      .from("movimientos")
      .select("*, perfiles(nombre)")
      .eq("producto_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (!producto) notFound();
  const p = producto as Producto;
  const historial = (movs ?? []) as (Movimiento & { perfiles: { nombre: string } | null })[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{p.nombre}</h1>
        <div className="flex gap-2">
          <Link href={`/movimientos?producto=${p.id}`} className="btn">Registrar movimiento</Link>
          {perfil.rol === "admin" && (
            <form action={desactivarProducto}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn-peligro">Eliminar</button>
            </form>
          )}
        </div>
      </div>
      <Aviso error={error} />

      <div className="card flex flex-wrap items-center gap-4">
        {p.imagen_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imagen_url} alt={p.nombre} className="h-24 w-24 rounded-md object-cover" />
        )}
        <div>
          <p className="text-sm text-slate-500">Stock actual</p>
          <p className="text-3xl font-semibold">{cantidad(p.stock_actual)} <span className="text-base font-normal">{p.unidad}</span></p>
          {p.stock_actual <= p.stock_minimo && <p className="text-sm text-red-600">Stock bajo (mínimo {cantidad(p.stock_minimo)})</p>}
        </div>
      </div>

      <FormProducto
        action={actualizarProducto}
        categorias={(categorias ?? []) as Categoria[]}
        proveedores={(proveedores ?? []) as Proveedor[]}
        producto={p}
      />

      <h2 className="text-lg font-semibold">Historial</h2>
      <div className="card overflow-x-auto p-0">
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Stock</th><th>Motivo</th><th>Usuario</th></tr></thead>
          <tbody>
            {historial.map((m) => (
              <tr key={m.id}>
                <td>{fechaHora(m.created_at)}</td>
                <td className="capitalize">{m.tipo}</td>
                <td>{m.tipo === "ajuste" && m.cantidad > 0 ? "+" : ""}{cantidad(m.cantidad)}</td>
                <td>{cantidad(m.stock_anterior)} → {cantidad(m.stock_nuevo)}</td>
                <td>{m.motivo ?? "—"}</td>
                <td>{m.perfiles?.nombre ?? "—"}</td>
              </tr>
            ))}
            {!historial.length && <tr><td colSpan={6} className="py-6 text-center text-slate-500">Sin movimientos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
