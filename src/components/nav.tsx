"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowsLeftRight, CalendarCheck, CashRegister, ChartBar, House, Package, ShoppingBag, ShoppingCart, Tag, Truck, Users, UsersThree,
} from "@phosphor-icons/react";

const items = [
  { href: "/", texto: "Dashboard", Icono: House },
  { href: "/ventas", texto: "Ventas", Icono: ShoppingCart },
  { href: "/cobranza", texto: "Cobranza", Icono: CalendarCheck },
  { href: "/caja", texto: "Caja", Icono: CashRegister },
  { href: "/productos", texto: "Productos", Icono: Package },
  { href: "/compras", texto: "Compras", Icono: ShoppingBag },
  { href: "/movimientos", texto: "Movimientos", Icono: ArrowsLeftRight },
  { href: "/clientes", texto: "Clientes", Icono: Users },
  { href: "/categorias", texto: "Categorías", Icono: Tag },
  { href: "/proveedores", texto: "Proveedores", Icono: Truck },
  { href: "/reportes", texto: "Reportes", Icono: ChartBar },
  { href: "/usuarios", texto: "Usuarios", Icono: UsersThree },
];

function useActivo() {
  const ruta = usePathname();
  return (href: string) => (href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(`${href}/`));
}

export function NavLateral() {
  const activo = useActivo();
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, texto, Icono }) => (
        <Link
          key={href}
          href={href}
          aria-current={activo(href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-200 ${
            activo(href)
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
        >
          <Icono size={20} weight={activo(href) ? "fill" : "regular"} />
          {texto}
        </Link>
      ))}
    </nav>
  );
}

export function NavInferior() {
  const activo = useActivo();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-zinc-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-900/90">
      {items.map(({ href, texto, Icono }) => (
        <Link
          key={href}
          href={href}
          aria-current={activo(href) ? "page" : undefined}
          className={`flex min-w-16 flex-1 shrink-0 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition active:scale-90 ${
            activo(href) ? "text-emerald-800 dark:text-emerald-300" : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <Icono size={22} weight={activo(href) ? "fill" : "regular"} />
          <span className="max-w-full truncate px-0.5">{texto}</span>
        </Link>
      ))}
    </nav>
  );
}
