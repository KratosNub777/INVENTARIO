const base = "/api/exportar";

function Enlaces({ tipo }: { tipo: string }) {
  return (
    <div className="flex gap-2">
      <a className="btn" href={`${base}?tipo=${tipo}&formato=xlsx`}>Excel</a>
      <a className="btn-sec" href={`${base}?tipo=${tipo}&formato=pdf`}>PDF</a>
    </div>
  );
}

export default function Reportes() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reportes</h1>

      <section className="card space-y-3">
        <div>
          <h2 className="font-semibold">Inventario actual valorizado</h2>
          <p className="text-sm text-slate-500">Stock de cada producto activo con su valor a costo y a precio de venta.</p>
        </div>
        <Enlaces tipo="inventario" />
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="font-semibold">Productos con stock bajo</h2>
          <p className="text-sm text-slate-500">Productos en o bajo su stock mínimo.</p>
        </div>
        <Enlaces tipo="stock-bajo" />
      </section>

      <form action={base} className="card space-y-3">
        <input type="hidden" name="tipo" value="movimientos" />
        <div>
          <h2 className="font-semibold">Movimientos por período</h2>
          <p className="text-sm text-slate-500">Deja las fechas vacías para exportar todo el historial.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
          <label><span className="label">Desde</span><input name="desde" type="date" className="input" /></label>
          <label><span className="label">Hasta</span><input name="hasta" type="date" className="input" /></label>
        </div>
        <div className="flex gap-2">
          <button name="formato" value="xlsx" className="btn">Excel</button>
          <button name="formato" value="pdf" className="btn-sec">PDF</button>
        </div>
      </form>
    </div>
  );
}
