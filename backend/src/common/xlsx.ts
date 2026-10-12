import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import ExcelJS from 'exceljs';

/** Cartella monitorata da Integra per gli import (ordini; clienti se IMPORT_CLIENTI_DIR non e' impostata).
 *  Il backend gira con cwd = backend/, quindi il default e' <progetto>/ordini. */
export function cartellaOrdiniIntegra(): string {
  return (
    process.env.EXPORT_ORDINI_DIR?.trim() ||
    path.resolve(process.cwd(), '..', 'ordini')
  );
}

/** Scrive su nome temporaneo e poi rinomina: Integra non deve mai leggere un file a meta'. */
export async function scriviXlsxAtomico(
  dir: string,
  nomeFile: string,
  righe: (string | number)[][],
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Foglio1');
  for (const r of righe) ws.addRow(r);
  const finale = path.join(dir, nomeFile);
  const tmp = path.join(dir, `.${nomeFile}.tmp`);
  await wb.xlsx.writeFile(tmp);
  await fs.rename(tmp, finale);
}
