"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { fallar } from "@/lib/util";
import { clienteSchema, validar } from "@/lib/validaciones";

export async function guardarCliente(formData: FormData) {
  const { supabase } = await requireAdmin();
  const datos = validar(clienteSchema, formData, "/clientes");
  const id = formData.get("id");

  const { error: err } = id
    ? await supabase.from("clientes").update(datos).eq("id", String(id))
    : await supabase.from("clientes").insert(datos);
  if (err) fallar("/clientes", err.message);
  revalidatePath("/clientes");
  redirect("/clientes");
}

// Borrado lógico: el cliente sigue en ventas y cuotas pasadas.
export async function eliminarCliente(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("clientes").update({ activo: false }).eq("id", String(formData.get("id")));
  if (error) fallar("/clientes", error.message);
  revalidatePath("/clientes");
  redirect("/clientes");
}
