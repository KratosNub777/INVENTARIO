import Link from "next/link";
import { BellRinging, Cube, SignOut } from "@phosphor-icons/react/dist/ssr";
import { logout } from "@/actions/auth";
import { NavInferior, NavLateral } from "@/components/nav";
import { getSesion } from "@/lib/auth";
import { diasPara, enDias } from "@/lib/util";

// Aviso en todas las pantallas: cuotas vencidas o que vencen en los próximos 7 días.
function AvisoCuotas({ vences }: { vences: string[] }) {
  if (!vences.length) return null;
  const vencidas = vences.filter((v) => diasPara(v) < 0).length;
  const proximas = vences.length - vencidas;
  const partes = [
    vencidas && `${vencidas} ${vencidas === 1 ? "cuota vencida" : "cuotas vencidas"}`,
    proximas && `${proximas} ${proximas === 1 ? "cuota vence" : "cuotas vencen"} en los próximos 7 días`,
  ].filter(Boolean);
  return (
    <Link
      href="/cobranza"
      className="entrada mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 hover:underline dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
    >
      <BellRinging size={18} weight="fill" className="shrink-0" />
      {partes.join(" · ")}. Ver cobranza
    </Link>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-white">
        <Cube size={18} weight="fill" />
      </span>
      Inventario
    </div>
  );
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, perfil } = await getSesion();
  const { data: cuotas } = await supabase.from("cuotas").select("vence").eq("pagada", false).lte("vence", enDias(7));
  return (
    <div className="min-h-[100dvh] md:flex">
      <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col justify-between border-r border-zinc-200 bg-white p-4 md:flex dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-6">
          <Marca />
          <NavLateral />
        </div>
        <form action={logout} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 p-2 pl-3 dark:border-zinc-800">
          <span className="truncate text-sm font-medium">{perfil.nombre}</span>
          <button aria-label="Cerrar sesión" title="Cerrar sesión" className="btn-sec px-2">
            <SignOut size={18} />
          </button>
        </form>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-900/90">
        <Marca />
        <form action={logout}>
          <button aria-label="Cerrar sesión" className="btn-sec px-2"><SignOut size={18} /></button>
        </form>
      </header>

      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8">
        <div className="mx-auto max-w-6xl">
          <AvisoCuotas vences={((cuotas ?? []) as { vence: string }[]).map((c) => c.vence)} />
          {children}
        </div>
      </main>
      <NavInferior />
    </div>
  );
}
