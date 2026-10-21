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

export const clienteSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  rut: texto,
  telefono: texto,
  email: z.string().trim().default("").pipe(z.union([z.literal(""), z.email("Email inválido")])).transform((v) => v || null),
  direccion: texto,
});

// Listas que el formulario manda como JSON en un input oculto.
const json = <T extends z.ZodType>(schema: T) =>
  z.string().default("[]").transform((s, ctx) => {
    try {
      return JSON.parse(s);
    } catch {
      ctx.addIssue({ code: "custom", message: "Datos inválidos" });
      return z.NEVER;
    }
  }).pipe(schema);

const medio = z.enum(["efectivo", "transferencia", "tarjeta"], { message: "Medio de pago inválido" });
const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const lineas = json(z.array(z.object({
  producto_id: z.string().uuid("Elige un producto en cada línea"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  precio: z.number().min(0, "El precio no puede ser negativo"),
})).min(1, "Agrega al menos un producto"));

export const ventaSchema = z.object({
  cliente_id: id,
  tipo_pago: z.enum(["contado", "credito"]),
  medio: medio.optional(),
  items: lineas,
  cuotas: json(z.array(z.object({ monto: z.number().positive("Cada cuota debe ser mayor a 0"), vence: fechaISO }))),
  nota: texto,
});

export const compraSchema = z.object({
  proveedor_id: id,
  medio,
  items: lineas,
  nota: texto,
});

export const abonoSchema = z.object({
  cuota_id: z.string().uuid(),
  // vacío = paga todo el saldo
  monto: z.string().trim().default("").transform((v) => (v ? Number(v) : null)).refine((v) => v === null || v > 0, "Monto inválido"),
  medio,
});

export const cuotaSchema = z.object({
  id: z.string().uuid(),
  monto: z.coerce.number({ message: "Número inválido" }).positive("El monto debe ser mayor a 0"),
  vence: fechaISO,
});

export const movimientoCajaSchema = z.object({
  tipo: z.enum(["ingreso", "egreso"]),
  monto: z.coerce.number({ message: "Número inválido" }).positive("El monto debe ser mayor a 0"),
  medio,
  categoria: z.string().trim().min(1, "Elige una categoría"),
  concepto: texto,
});

export const montoSchema = z.object({ monto: numero });

export const invitacionSchema = z.object({
  email: z.email("Email inválido"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
});

// Devuelve los datos validados; si no valen, vuelve a `ruta` con el primer error legible.
export function validar<T extends z.ZodType>(schema: T, formData: FormData, ruta: string): z.infer<T> {
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) fallar(ruta, r.error.issues[0].message);
  return r.data;
}
