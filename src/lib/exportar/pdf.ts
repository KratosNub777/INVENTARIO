import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Tabla } from "./excel";

export function aPdf(t: Tabla) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(t.titulo, 14, 14);
  autoTable(doc, {
    startY: 20,
    head: [t.columnas],
    body: t.filas.map((f) => f.map(String)),
    styles: { fontSize: 8 },
  });
  return new Uint8Array(doc.output("arraybuffer"));
}
