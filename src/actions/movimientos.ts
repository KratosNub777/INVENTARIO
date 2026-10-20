"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { fallar } from "@/lib/util";
import { movimientoSchema, validar } from "@/lib/validaciones";

export async function registrarMovimiento(formData: FormData) {
  const { supabase } = await getSesion();
  const { datos, error } = validar(movimientoSchema, formData);
  if (error) fallar("/movimientos", error);

  const { error: errRpc } = await supabase.rpc("registrar_movimiento", {
    p_producto_id: datos!.producto_id,
    p_tipo: datos!.tipo,
    p_cantidad: datos!.cantidad,
    p_motivo: datos!.motivo,
  });
  if (errRpc) fallar(`/movimientos?producto=${datos!.producto_id}`, errRpc.message);

  revalidatePath("/", "layout");
  redirect("/movimientos");
}
