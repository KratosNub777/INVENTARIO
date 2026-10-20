"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fallar } from "@/lib/util";
import { invitacionSchema, validar } from "@/lib/validaciones";

// Todo usuario nuevo queda como admin (lo decide el trigger de la base).
export async function invitarUsuario(formData: FormData) {
  await requireAdmin();
  const datos = validar(invitacionSchema, formData, "/usuarios");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) fallar("/usuarios", "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor");

  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(datos.email, {
    data: { nombre: datos.nombre },
  });
  if (error) fallar("/usuarios", error.message);
  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function actualizarUsuario(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === user.id) fallar("/usuarios", "No puedes desactivarte a ti mismo");

  const { error } = await supabase.from("perfiles").update({ activo: formData.get("activo") === "on" }).eq("id", id);
  if (error) fallar("/usuarios", error.message);
  revalidatePath("/usuarios");
  redirect("/usuarios");
}
