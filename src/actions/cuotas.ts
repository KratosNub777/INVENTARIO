"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSesion, requireAdmin } from "@/lib/auth";
import { fallar } from "@/lib/util";
import { abonoSchema, cuotaSchema, validar } from "@/lib/validaciones";

// Vuelve a la misma vista de cobranza (con sus filtros); solo rutas internas de /cobranza.
const volver = (formData: FormData) => {
  const v = String(formData.get("volver") ?? "");
  return v.startsWith("/cobranza") ? v : "/cobranza";
};

// Abono parcial, o el saldo completo si se pulsa "Pagar saldo" (name="todo").
export async function abonarCuota(formData: FormData) {
  const { supabase } = await getSesion();
  const ruta = volver(formData);
  const datos = validar(abonoSchema, formData, ruta);
  if (!formData.get("todo") && datos.monto === null) fallar(ruta, "Escribe el monto del abono");
  const { error } = await supabase.rpc("abonar_cuota", {
    p_cuota_id: datos.cuota_id,
    p_monto: formData.get("todo") ? null : datos.monto,
    p_medio: datos.medio,
  });
  if (error) fallar(ruta, error.message);
  revalidatePath("/", "layout");
  redirect(ruta);
}

export async function editarCuota(formData: FormData) {
  const { supabase } = await requireAdmin();
  const ruta = volver(formData);
  const { id, ...datos } = validar(cuotaSchema, formData, ruta);
  const { data, error } = await supabase.from("cuotas").update(datos).eq("id", id).select("id");
  if (error) fallar(ruta, error.code === "23514" ? "El monto no puede ser menor a lo ya abonado" : error.message);
  if (!data?.length) fallar(ruta, "La cuota ya está pagada y no se puede editar");
  revalidatePath("/", "layout");
  redirect(ruta);
}
