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

export type Medio = "efectivo" | "transferencia" | "tarjeta";

export interface Cliente {
  id: string;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
}

export interface Venta {
  id: string;
  numero: number;
  cliente_id: string | null;
  tipo_pago: "contado" | "credito";
  medio: Medio | null;
  total: number;
  nota: string | null;
  usuario_id: string | null;
  created_at: string;
}

export interface Cuota {
  id: string;
  venta_id: string;
  numero: number;
  monto: number;
  vence: string;
  pagado: number;
  pagada: boolean;
}

export interface Compra {
  id: string;
  numero: number;
  proveedor_id: string | null;
  medio: Medio;
  total: number;
  nota: string | null;
  usuario_id: string | null;
  created_at: string;
}

export interface MovimientoCaja {
  id: string;
  tipo: "ingreso" | "egreso";
  monto: number;
  medio: Medio;
  categoria: string;
  concepto: string | null;
  usuario_id: string | null;
  created_at: string;
}

export interface Caja {
  id: string;
  abierta_at: string;
  monto_inicial: number;
  cerrada_at: string | null;
  contado: number | null;
  esperado: number | null;
  diferencia: number | null;
}
