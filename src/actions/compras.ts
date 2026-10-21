"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { fallar } from "@/lib/util";
import { compraSchema, validar } from "@/lib/validaciones";

export async function registrarCompra(formData: FormData) {
  const { supabase } = await getSesion();
  const datos = validar(compraSchema, formData, "/compras");

  const { error } = await supabase.rpc("registrar_compra", {
    p_proveedor_id: datos.proveedor_id,
    p_medio: datos.medio,
    p_items: datos.items.map(({ precio, ...i }) => ({ ...i, costo: precio })),
    p_nota: datos.nota,
  });
  if (error) fallar("/compras", error.message);

  revalidatePath("/", "layout");
  redirect("/compras");
}
