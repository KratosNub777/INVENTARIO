"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSesion, requireAdmin } from "@/lib/auth";
import { fallar } from "@/lib/util";
import { validar, ventaSchema } from "@/lib/validaciones";

export async function registrarVenta(formData: FormData) {
  const { supabase } = await getSesion();
  const datos = validar(ventaSchema, formData, "/ventas");
  const credito = datos.tipo_pago === "credito";
  if (credito && !datos.cliente_id) fallar("/ventas", "La venta a cuotas necesita un cliente");
  if (credito && !datos.cuotas.length) fallar("/ventas", "Define al menos una cuota");
  if (!credito && !datos.medio) fallar("/ventas", "Elige el medio de pago");

  const { error } = await supabase.rpc("registrar_venta", {
    p_cliente_id: datos.cliente_id,
    p_tipo_pago: datos.tipo_pago,
    p_medio: credito ? null : datos.medio,
    p_items: datos.items,
    p_cuotas: credito ? datos.cuotas : null,
    p_nota: datos.nota,
  });
  if (error) fallar("/ventas", error.message);

  revalidatePath("/", "layout");
  redirect(credito ? "/cobranza" : "/ventas");
}

// Devuelve el stock y borra la venta con sus cuotas y movimientos de caja (RPC eliminar_venta).
export async function eliminarVenta(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("eliminar_venta", { p_venta_id: String(formData.get("id")) });
  if (error) fallar("/ventas", error.message);

  revalidatePath("/", "layout");
  redirect("/ventas");
}
