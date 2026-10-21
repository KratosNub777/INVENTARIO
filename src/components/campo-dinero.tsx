"use client";

import { useEffect, useRef, useState } from "react";

const miles = (digitos: string) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const limpiar = (v: string) => v.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

type Props = Omit<React.ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange" | "name"> & {
  name?: string;
  value?: string; // modo controlado: solo dígitos
  defaultValue?: string | number;
  onValor?: (digitos: string) => void;
};

// Monto en guaraníes con puntos de miles mientras se escribe. El valor que se envía (input oculto) son solo dígitos.
// shortcut: sin decimales (PYG no los usa) y el cursor salta al final si se edita a mitad del número.
export function CampoDinero({ name, value, defaultValue, onValor, className = "input", ...resto }: Props) {
  const inicial = defaultValue == null || defaultValue === "" ? "" : String(Math.round(Number(defaultValue)));
  const [interno, setInterno] = useState(inicial);
  const ref = useRef<HTMLInputElement>(null);
  const digitos = value ?? interno;

  // El botón "Cancelar" (type="reset") restaura el valor inicial.
  useEffect(() => {
    const form = ref.current?.form;
    const reiniciar = () => setInterno(inicial);
    form?.addEventListener("reset", reiniciar);
    return () => form?.removeEventListener("reset", reiniciar);
  }, [inicial]);

  return (
    <>
      {name && <input type="hidden" name={name} value={digitos} />}
      <input
        {...resto}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={miles(digitos)}
        onChange={(e) => {
          const d = limpiar(e.target.value);
          setInterno(d);
          onValor?.(d);
        }}
        className={className}
      />
    </>
  );
}
