import Link from "next/link";

type Props = { icono: React.ReactNode; titulo: string; texto?: string; href?: string; accion?: string };

export function Vacio({ icono, titulo, texto, href, accion }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        {icono}
      </span>
      <p className="font-medium">{titulo}</p>
      {texto && <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">{texto}</p>}
      {href && accion && <Link href={href} className="btn mt-2">{accion}</Link>}
    </div>
  );
}
