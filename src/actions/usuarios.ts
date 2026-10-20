"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fallar } from "@/lib/util";
import { invitacionSchema, validar } from "@/lib/validaciones";

export async function invitarUsuario(formData: FormData) {
  await requireAdmin();
  const datos = validar(invitacionSchema, formData, "/usuarios");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) fallar("/usuarios", "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor");

  const admin = createAdminClient();
  const { data, error: errInv } = await admin.auth.admin.inviteUserByEmail(datos.email, {
    data: { nombre: datos.nombre },
  });
  if (errInv) fallar("/usuarios", errInv.message);

  // El trigger crea el perfil como operador; ajustamos el rol si hace falta.
  if (datos.rol === "admin") {
    const { error: errRol } = await admin.from("perfiles").update({ rol: "admin" }).eq("id", data.user.id);
    if (errRol) fallar("/usuarios", errRol.message);
  }
  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function actualizarUsuario(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === user.id) fallar("/usuarios", "No puedes cambiar tu propio rol ni desactivarte");

  const { error } = await supabase
    .from("perfiles")
    .update({ rol: String(formData.get("rol")), activo: formData.get("activo") === "on" })
    .eq("id", id);
  if (error) fallar("/usuarios", error.message);
  revalidatePath("/usuarios");
  redirect("/usuarios");
}
