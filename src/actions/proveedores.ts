"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { fallar } from "@/lib/util";
import { proveedorSchema, validar } from "@/lib/validaciones";

export async function guardarProveedor(formData: FormData) {
  const { supabase } = await requireAdmin();
  const datos = validar(proveedorSchema, formData, "/proveedores");
  const id = formData.get("id");

  const { error: err } = id
    ? await supabase.from("proveedores").update(datos).eq("id", String(id))
    : await supabase.from("proveedores").insert(datos);
  if (err) fallar("/proveedores", err.message);
  revalidatePath("/proveedores");
  redirect("/proveedores");
}

export async function eliminarProveedor(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("proveedores").delete().eq("id", String(formData.get("id")));
  if (error) fallar("/proveedores", error.message);
  revalidatePath("/proveedores");
  redirect("/proveedores");
}
