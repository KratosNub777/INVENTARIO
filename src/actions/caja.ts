"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { fallar } from "@/lib/util";
import { montoSchema, movimientoCajaSchema, validar } from "@/lib/validaciones";

// Ingreso o egreso manual (gastos, aportes, retiros). Los de ventas, cuotas y compras se crean solos.
export async function registrarMovimientoCaja(formData: FormData) {
  const { supabase } = await getSesion();
  const datos = validar(movimientoCajaSchema, formData, "/caja");
  const { error } = await supabase.from("caja_movimientos").insert(datos);
  if (error) fallar("/caja", error.message);
  revalidatePath("/caja");
  redirect("/caja");
}

export async function abrirCaja(formData: FormData) {
  const { supabase } = await getSesion();
  const { monto } = validar(montoSchema, formData, "/caja");
  const { error } = await supabase.from("cajas").insert({ monto_inicial: monto });
  if (error) fallar("/caja", error.code === "23505" ? "Ya hay una caja abierta" : error.message);
  revalidatePath("/caja");
  redirect("/caja");
}

export async function cerrarCaja(formData: FormData) {
  const { supabase } = await getSesion();
  const { monto } = validar(montoSchema, formData, "/caja");
  const { error } = await supabase.rpc("cerrar_caja", { p_contado: monto });
  if (error) fallar("/caja", error.message);
  revalidatePath("/caja");
  redirect("/caja");
}
