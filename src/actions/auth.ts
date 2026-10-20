"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fallar } from "@/lib/util";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) fallar("/login", "Email o contraseña incorrectos");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
