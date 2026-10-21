export default function Cargando() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="esqueleto h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="esqueleto h-28 rounded-2xl" />)}
      </div>
      <div className="esqueleto h-64 rounded-2xl" />
    </div>
  );
}
