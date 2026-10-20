import ExcelJS from "exceljs";

export interface Tabla {
  titulo: string;
  columnas: string[];
  filas: (string | number)[][];
}

export async function aExcel(t: Tabla) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet(t.titulo.slice(0, 31));
  hoja.addRow(t.columnas).font = { bold: true };
  t.filas.forEach((f) => hoja.addRow(f));
  hoja.columns.forEach((c) => (c.width = 18));
  return new Uint8Array(await libro.xlsx.writeBuffer());
}
