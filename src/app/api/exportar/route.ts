import { createClient } from "@/lib/supabase/server";
import { aExcel, type Tabla } from "@/lib/exportar/excel";
import { aPdf } from "@/lib/exportar/pdf";
import { fechaHora } from "@/lib/util";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Params = { desde?: string; hasta?: string };

async function inventario(supabase: Supabase): Promise<Tabla> {
  const { data } = await supabase
    .from("productos")
    .select("sku, nombre, unidad, stock_actual, precio_costo, precio_venta, categorias(nombre)")
    .eq("activo", true)
    .order("nombre")
    .limit(10000);
  const filas = (data ?? []).map((p) => {
    const categoria = (p.categorias as unknown as { nombre: string } | null)?.nombre ?? "";
    return [
      p.sku, p.nombre, categoria, p.unidad, Number(p.stock_actual), Number(p.precio_costo), Number(p.precio_venta),
      Number(p.stock_actual) * Number(p.precio_costo), Number(p.stock_actual) * Number(p.precio_venta),
    ];
  });
  const total = (i: number) => filas.reduce((s, f) => s + Number(f[i]), 0);
  filas.push(["", "TOTAL", "", "", "", "", "", total(7), total(8)]);
  return {
    titulo: "Inventario valorizado",
    columnas: ["SKU", "Producto", "Categoría", "Unidad", "Stock", "Costo unit.", "Venta unit.", "Valor costo", "Valor venta"],
    filas,
  };
}

async function movimientos(supabase: Supabase, { desde, hasta }: Params): Promise<Tabla> {
  let q = supabase
    .from("movimientos")
    .select("created_at, tipo, cantidad, stock_anterior, stock_nuevo, motivo, productos(sku, nombre), perfiles(nombre)")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (desde) q = q.gte("created_at", desde);
  if (hasta) q = q.lte("created_at", `${hasta}T23:59:59`);
  const { data } = await q;
  return {
    titulo: `Movimientos ${desde ?? ""} ${hasta ?? ""}`.trim(),
    columnas: ["Fecha", "SKU", "Producto", "Tipo", "Cantidad", "Stock anterior", "Stock nuevo", "Motivo", "Usuario"],
    filas: (data ?? []).map((m) => {
      const prod = m.productos as unknown as { sku: string; nombre: string } | null;
      const usuario = m.perfiles as unknown as { nombre: string } | null;
      return [
        fechaHora(m.created_at), prod?.sku ?? "", prod?.nombre ?? "", m.tipo, Number(m.cantidad),
        Number(m.stock_anterior), Number(m.stock_nuevo), m.motivo ?? "", usuario?.nombre ?? "",
      ];
    }),
  };
}

async function stockBajo(supabase: Supabase): Promise<Tabla> {
  const { data } = await supabase.from("v_stock_bajo").select("*");
  return {
    titulo: "Productos con stock bajo",
    columnas: ["SKU", "Producto", "Unidad", "Stock", "Mínimo", "Ubicación"],
    filas: (data ?? []).map((p) => [p.sku, p.nombre, p.unidad, Number(p.stock_actual), Number(p.stock_minimo), p.ubicacion ?? ""]),
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const p = new URL(request.url).searchParams;
  const tipo = p.get("tipo");
  const formato = p.get("formato") === "pdf" ? "pdf" : "xlsx";
  const tabla =
    tipo === "inventario" ? await inventario(supabase)
    : tipo === "movimientos" ? await movimientos(supabase, { desde: p.get("desde") || undefined, hasta: p.get("hasta") || undefined })
    : tipo === "stock-bajo" ? await stockBajo(supabase)
    : null;
  if (!tabla) return new Response("Tipo de reporte inválido", { status: 400 });

  const cuerpo = formato === "pdf" ? aPdf(tabla) : await aExcel(tabla);
  return new Response(cuerpo as BodyInit, {
    headers: {
      "Content-Type": formato === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${tipo}.${formato}"`,
    },
  });
}
