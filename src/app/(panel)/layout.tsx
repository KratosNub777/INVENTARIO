import Link from "next/link";
import { logout } from "@/actions/auth";
import { getSesion } from "@/lib/auth";

const enlaces = [
  ["/", "Dashboard"],
  ["/productos", "Productos"],
  ["/movimientos", "Movimientos"],
  ["/categorias", "Categorías"],
  ["/proveedores", "Proveedores"],
  ["/reportes", "Reportes"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await getSesion();
  const items = perfil.rol === "admin" ? [...enlaces, ["/usuarios", "Usuarios"]] : enlaces;
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-slate-900 text-slate-100 md:w-56 md:shrink-0">
        <div className="flex items-center justify-between px-4 py-3 md:block">
          <span className="font-semibold">Inventario</span>
          <span className="text-xs text-slate-400 md:block">{perfil.nombre} · {perfil.rol}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
          {items.map(([href, texto]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-slate-700">
              {texto}
            </Link>
          ))}
          <form action={logout} className="md:mt-4">
            <button className="w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700">
              Cerrar sesión
            </button>
          </form>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
