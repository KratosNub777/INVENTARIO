import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

export function Aviso({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="entrada mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
    >
      <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
      {error}
    </p>
  );
}
