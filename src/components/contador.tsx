"use client";

import { useEffect, useRef } from "react";
import { dinero, LOCALE } from "@/lib/util";

// Cuenta desde 0 hasta el valor al cargar. Escribe directo en el nodo de texto (sin estado de React).
export function Contador({ valor, moneda = false }: { valor: number; moneda?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const formato = (n: number) =>
    moneda ? dinero(n) : Math.round(n).toLocaleString(LOCALE);

  useEffect(() => {
    const nodo = ref.current?.firstChild;
    if (!nodo || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const inicio = performance.now();
    let raf = 0;
    const paso = (ahora: number) => {
      const p = Math.min(1, (ahora - inicio) / 900);
      nodo.nodeValue = formato(valor * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, moneda]);

  return <span ref={ref}>{formato(valor)}</span>;
}
