import { Cube } from "@phosphor-icons/react/dist/ssr";
import { login } from "@/actions/auth";
import { Aviso } from "@/components/aviso";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-emerald-950 lg:block">
        <div className="absolute -left-24 -top-24 size-[32rem] rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="absolute -bottom-32 right-0 size-[30rem] rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5 font-semibold">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15 backdrop-blur">
              <Cube size={20} weight="fill" />
            </span>
            Inventario
          </div>
          <div className="max-w-md">
            <h2 className="text-5xl font-semibold leading-[1.05] tracking-tight">Tu stock, siempre al día.</h2>
            <p className="mt-4 text-emerald-100/90">Entradas, salidas y reportes en un solo lugar, desde el computador o el celular.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form action={login} className="entrada w-full max-w-sm space-y-5">
          <div>
            <h1 className="titulo">Iniciar sesión</h1>
            <p className="subtitulo">Ingresa con tu cuenta para continuar.</p>
          </div>
          <Aviso error={error} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
          </div>
          <button className="btn w-full py-2.5">Entrar</button>
        </form>
      </section>
    </main>
  );
}
