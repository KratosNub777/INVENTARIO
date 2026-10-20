import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/types/database";

export async function getSesion() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("perfiles").select("*").eq("id", user.id).single();
  const perfil = data as Perfil | null;
  if (!perfil?.activo) {
    await supabase.auth.signOut();
    redirect("/login?error=Cuenta%20desactivada");
  }
  return { supabase, user, perfil };
}

export async function requireAdmin() {
  const sesion = await getSesion();
  if (sesion.perfil.rol !== "admin") redirect("/?error=Solo%20un%20administrador%20puede%20hacer%20esto");
  return sesion;
}
