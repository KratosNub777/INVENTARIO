import type { Categoria, Producto, Proveedor } from "@/types/database";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  categorias: Categoria[];
  proveedores: Proveedor[];
  producto?: Producto;
};

function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function FormProducto({ action, categorias, proveedores, producto: p }: Props) {
  return (
    <form action={action} className="card grid gap-4 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Campo label="SKU *"><input name="sku" required defaultValue={p?.sku} className="input" /></Campo>
      <Campo label="Nombre *"><input name="nombre" required defaultValue={p?.nombre} className="input" /></Campo>
      <Campo label="Código de barras"><input name="codigo_barras" defaultValue={p?.codigo_barras ?? ""} className="input" /></Campo>
      <Campo label="Unidad">
        <input name="unidad" defaultValue={p?.unidad ?? "unid"} list="unidades" className="input" />
        <datalist id="unidades">
          {["unid", "kg", "g", "L", "m", "caja", "pack"].map((u) => <option key={u} value={u} />)}
        </datalist>
      </Campo>
      <Campo label="Categoría">
        <select name="categoria_id" defaultValue={p?.categoria_id ?? ""} className="input">
          <option value="">Sin categoría</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Campo>
      <Campo label="Proveedor">
        <select name="proveedor_id" defaultValue={p?.proveedor_id ?? ""} className="input">
          <option value="">Sin proveedor</option>
          {proveedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      </Campo>
      <Campo label="Precio costo"><input name="precio_costo" type="number" min="0" step="0.01" defaultValue={p?.precio_costo ?? 0} className="input" /></Campo>
      <Campo label="Precio venta"><input name="precio_venta" type="number" min="0" step="0.01" defaultValue={p?.precio_venta ?? 0} className="input" /></Campo>
      <Campo label="Stock mínimo"><input name="stock_minimo" type="number" min="0" step="any" defaultValue={p?.stock_minimo ?? 0} className="input" /></Campo>
      {!p && (
        <Campo label="Stock inicial"><input name="stock_inicial" type="number" min="0" step="any" defaultValue={0} className="input" /></Campo>
      )}
      <Campo label="Ubicación (estante / pasillo)"><input name="ubicacion" defaultValue={p?.ubicacion ?? ""} className="input" /></Campo>
      <Campo label="Imagen (máx. 4 MB)"><input name="imagen" type="file" accept="image/*" className="input" /></Campo>
      <Campo label="Descripción" className="sm:col-span-2">
        <textarea name="descripcion" rows={3} defaultValue={p?.descripcion ?? ""} className="input" />
      </Campo>
      <div className="sm:col-span-2">
        <button className="btn">{p ? "Guardar cambios" : "Crear producto"}</button>
      </div>
    </form>
  );
}
