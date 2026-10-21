import { crearProducto } from "@/actions/productos";
import { Aviso } from "@/components/aviso";
import { FormProducto } from "@/components/form-producto";
import { getSesion } from "@/lib/auth";
import type { Categoria, Proveedor } from "@/types/database";

export default async function NuevoProducto({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase } = await getSesion();
  const [{ data: categorias }, { data: proveedores }] = await Promise.all([
    supabase.from("categorias").select("*").order("nombre"),
    supabase.from("proveedores").select("*").order("nombre"),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="titulo">Nuevo producto</h1>
      <Aviso error={error} />
      <FormProducto
        action={crearProducto}
        categorias={(categorias ?? []) as Categoria[]}
        proveedores={(proveedores ?? []) as Proveedor[]}
      />
    </div>
  );
}
