"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { fallar } from "@/lib/util";
import { productoSchema, validar } from "@/lib/validaciones";

type Supabase = Awaited<ReturnType<typeof getSesion>>["supabase"];

const MAX_IMAGEN = 4 * 1024 * 1024;

// Sube la imagen (si viene) y devuelve su URL pública, o un error legible.
async function subirImagen(supabase: Supabase, archivo: FormDataEntryValue | null) {
  if (!(archivo instanceof File) || archivo.size === 0) return { url: null, error: null };
  if (!archivo.type.startsWith("image/")) return { url: null, error: "El archivo debe ser una imagen" };
  if (archivo.size > MAX_IMAGEN) return { url: null, error: "La imagen supera los 4 MB" };
  const ruta = `${crypto.randomUUID()}.${archivo.name.split(".").pop()}`;
  const { error } = await supabase.storage.from("productos").upload(ruta, archivo, { contentType: archivo.type });
  if (error) return { url: null, error: error.message };
  return { url: supabase.storage.from("productos").getPublicUrl(ruta).data.publicUrl, error: null };
}

const mensaje = (e: { code?: string; message: string }) =>
  e.code === "23505" ? "Ya existe un producto con ese SKU" : e.message;

export async function crearProducto(formData: FormData) {
  const { supabase } = await getSesion();
  const { datos, error } = validar(productoSchema, formData);
  if (error) fallar("/productos/nuevo", error);
  const stockInicial = Number(formData.get("stock_inicial") || 0);
  if (!(stockInicial >= 0)) fallar("/productos/nuevo", "El stock inicial no puede ser negativo");

  const img = await subirImagen(supabase, formData.get("imagen"));
  if (img.error) fallar("/productos/nuevo", img.error);

  const { data, error: errInsert } = await supabase
    .from("productos")
    .insert({ ...datos, imagen_url: img.url })
    .select("id")
    .single();
  if (errInsert) fallar("/productos/nuevo", mensaje(errInsert));

  if (stockInicial > 0) {
    const { error: errMov } = await supabase.rpc("registrar_movimiento", {
      p_producto_id: data!.id,
      p_tipo: "entrada",
      p_cantidad: stockInicial,
      p_motivo: "Stock inicial",
    });
    if (errMov) fallar(`/productos/${data!.id}`, errMov.message);
  }
  revalidatePath("/productos");
  redirect(`/productos/${data!.id}`);
}

export async function actualizarProducto(formData: FormData) {
  const { supabase } = await getSesion();
  const id = String(formData.get("id"));
  const ruta = `/productos/${id}`;
  const { datos, error } = validar(productoSchema, formData);
  if (error) fallar(ruta, error);

  const img = await subirImagen(supabase, formData.get("imagen"));
  if (img.error) fallar(ruta, img.error);

  const { error: errUpdate } = await supabase
    .from("productos")
    .update(img.url ? { ...datos, imagen_url: img.url } : datos)
    .eq("id", id);
  if (errUpdate) fallar(ruta, mensaje(errUpdate));
  revalidatePath("/productos");
  redirect(ruta);
}

// "Eliminar" = desactivar, para conservar el historial. Solo admin (lo exige un trigger).
export async function desactivarProducto(formData: FormData) {
  const { supabase } = await getSesion();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("productos").update({ activo: false }).eq("id", id);
  if (error) fallar(`/productos/${id}`, error.message);
  revalidatePath("/productos");
  redirect("/productos");
}
