import { z } from "zod";
import { fallar } from "@/lib/util";

const texto = z.string().trim().default("").transform((v) => v || null);
const id = z.string().trim().default("").transform((v) => v || null);
const numero = z.coerce.number({ message: "Número inválido" }).min(0, "No puede ser negativo");

export const productoSchema = z.object({
  sku: z.string().trim().min(1, "El SKU es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  codigo_barras: texto,
  descripcion: texto,
  ubicacion: texto,
  categoria_id: id,
  proveedor_id: id,
  unidad: z.string().trim().min(1).default("unid"),
  precio_costo: numero,
  precio_venta: numero,
  stock_minimo: numero,
});

export const movimientoSchema = z.object({
  producto_id: z.string().uuid("Elige un producto"),
  tipo: z.enum(["entrada", "salida", "ajuste"]),
  cantidad: numero,
  motivo: texto,
});

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  descripcion: texto,
});

export const proveedorSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  contacto: texto,
  telefono: texto,
  email: z.string().trim().default("").pipe(z.union([z.literal(""), z.email("Email inválido")])).transform((v) => v || null),
});

export const invitacionSchema = z.object({
  email: z.email("Email inválido"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  rol: z.enum(["admin", "operador"]),
});

// Devuelve los datos validados; si no valen, vuelve a `ruta` con el primer error legible.
export function validar<T extends z.ZodType>(schema: T, formData: FormData, ruta: string): z.infer<T> {
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) fallar(ruta, r.error.issues[0].message);
  return r.data;
}
