import Link from "next/link";
import { Aviso } from "@/components/aviso";
import { getSesion } from "@/lib/auth";
import { cantidad, dinero } from "@/lib/util";
import type { Categoria, Producto, Proveedor } from "@/types/database";

const POR_PAGINA = 20;
const ORDENES = ["nombre", "sku", "stock_actual", "precio_venta"];

type Fila = Producto & { categorias: { nombre: string } | null; proveedores: { nombre: string } | null };
type SP = { q?: string; categoria?: string; proveedor?: string; bajo?: string; orden?: string; dir?: string; pagina?: string; error?: string };

export default async function Productos({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await getSesion();
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const orden = ORDENES.includes(sp.orden ?? "") ? sp.orden! : "nombre";
  const asc = sp.dir !== "desc";

  let consulta = supabase
    .from("productos")
    .select("*, categorias(nombre), proveedores(nombre)", { count: "exact" })
    .eq("activo", true)
    .order(orden, { ascending: asc })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  // Quita caracteres que rompen la sintaxis del filtro .or() de PostgREST.
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim();
  if (q) consulta = consulta.or(`nombre.ilike.%${q}%,sku.ilike.%${q}%`);
  if (sp.categoria) consulta = consulta.eq("categoria_id", sp.categoria);
  if (sp.proveedor) consulta = consulta.eq("proveedor_id", sp.proveedor);
  if (sp.bajo) {
    const { data: bajos } = await supabase.from("v_stock_bajo").select("id");
    consulta = consulta.in("id", (bajos ?? []).map((b) => b.id));
  }

  const [{ data, count }, { data: categorias }, { data: proveedores }] = await Promise.all([
    consulta,
    supabase.from("categorias").select("*").order("nombre"),
    supabase.from("proveedores").select("*").order("nombre"),
  ]);
  const filas = (data ?? []) as Fila[];
  const paginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));

  const href = (cambios: Partial<SP>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, error: undefined, ...cambios })) if (v) params.set(k, v);
    return `/productos?${params}`;
  };
  const th = (campo: string, texto: string) => (
    <th>
      <Link href={href({ orden: campo, dir: orden === campo && asc ? "desc" : "asc", pagina: undefined })}>
        {texto}{orden === campo ? (asc ? " ↑" : " ↓") : ""}
      </Link>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Productos</h1>
        <Link href="/productos/nuevo" className="btn">Nuevo producto</Link>
      </div>
      <Aviso error={sp.error} />

      <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input name="q" defaultValue={sp.q} placeholder="Buscar nombre o SKU" className="input" />
        <select name="categoria" defaultValue={sp.categoria ?? ""} className="input">
          <option value="">Todas las categorías</option>
          {((categorias ?? []) as Categoria[]).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select name="proveedor" defaultValue={sp.proveedor ?? ""} className="input">
          <option value="">Todos los proveedores</option>
          {((proveedores ?? []) as Proveedor[]).map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="bajo" value="1" defaultChecked={!!sp.bajo} /> Solo stock bajo
        </label>
        <button className="btn-sec">Filtrar</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="tabla">
          <thead>
            <tr>{th("sku", "SKU")}{th("nombre", "Nombre")}<th>Categoría</th>{th("stock_actual", "Stock")}{th("precio_venta", "Precio venta")}<th>Ubicación</th></tr>
          </thead>
          <tbody>
            {filas.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td><Link href={`/productos/${p.id}`} className="font-medium underline">{p.nombre}</Link></td>
                <td>{p.categorias?.nombre ?? "—"}</td>
                <td>
                  {cantidad(p.stock_actual)} {p.unidad}
                  {p.stock_actual <= p.stock_minimo && (
                    <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Bajo</span>
                  )}
                </td>
                <td>{dinero(p.precio_venta)}</td>
                <td>{p.ubicacion ?? "—"}</td>
              </tr>
            ))}
            {!filas.length && <tr><td colSpan={6} className="py-6 text-center text-slate-500">Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>{count ?? 0} productos · página {pagina} de {paginas}</span>
        <div className="flex gap-2">
          {pagina > 1 && <Link className="btn-sec" href={href({ pagina: String(pagina - 1) })}>Anterior</Link>}
          {pagina < paginas && <Link className="btn-sec" href={href({ pagina: String(pagina + 1) })}>Siguiente</Link>}
        </div>
      </div>
    </div>
  );
}
