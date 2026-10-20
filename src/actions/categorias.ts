"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { fallar } from "@/lib/util";
import { categoriaSchema, validar } from "@/lib/validaciones";

const mensaje = (e: { code?: string; message: string }) =>
  e.code === "23505" ? "Ya existe una categoría con ese nombre" : e.message;

export async function guardarCategoria(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { datos, error } = validar(categoriaSchema, formData);
  if (error) fallar("/categorias", error);
  const id = formData.get("id");

  const { error: err } = id
    ? await supabase.from("categorias").update(datos!).eq("id", String(id))
    : await supabase.from("categorias").insert(datos!);
  if (err) fallar("/categorias", mensaje(err));
  revalidatePath("/categorias");
  redirect("/categorias");
}

export async function eliminarCategoria(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("categorias").delete().eq("id", String(formData.get("id")));
  if (error) fallar("/categorias", error.message);
  revalidatePath("/categorias");
  redirect("/categorias");
}
