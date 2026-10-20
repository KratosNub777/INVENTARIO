import { login } from "@/actions/auth";
import { Aviso } from "@/components/aviso";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={login} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Inventario</h1>
        <Aviso error={error} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        <button className="btn w-full">Entrar</button>
      </form>
    </main>
  );
}
