export type Rol = "admin" | "operador";
export type TipoMovimiento = "entrada" | "salida" | "ajuste";

export interface Perfil { id: string; nombre: string; rol: Rol; activo: boolean; created_at: string }
export interface Categoria { id: string; nombre: string; descripcion: string | null }
export interface Proveedor { id: string; nombre: string; contacto: string | null; telefono: string | null; email: string | null }

export interface Producto {
  id: string;
  sku: string;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  categoria_id: string | null;
  proveedor_id: string | null;
  unidad: string;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  ubicacion: string | null;
  imagen_url: string | null;
  activo: boolean;
}

export interface Movimiento {
  id: string;
  producto_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: string | null;
  usuario_id: string | null;
  created_at: string;
}
