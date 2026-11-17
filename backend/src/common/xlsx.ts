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

/**
 * Scrive un .xlsx partendo da un modello (export reale di Integra): le prime
 * `righeIntestazione` righe restano quelle del modello, i dati si accodano.
 * I valori sono indicizzati per **nome colonna** (riga 1 del modello,
 * case-insensitive): se Integra sposta o aggiunge colonne il mapping regge.
 */
export async function scriviXlsxDaModello(
  dir: string,
  nomeFile: string,
  modelloPath: string,
  righeIntestazione: number,
  righe: Record<string, string | number>[],
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(modelloPath);
  const ws = wb.worksheets[0];
  const nomi = new Map<number, string>();
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    const nome = String(cell.value ?? '').trim().toLowerCase();
    if (nome) nomi.set(col, nome);
  });
  if (ws.rowCount > righeIntestazione) {
    ws.spliceRows(righeIntestazione + 1, ws.rowCount - righeIntestazione);
  }
  for (const valori of righe) {
    const r = ws.getRow(ws.rowCount + 1);
    for (const [col, nome] of nomi) r.getCell(col).value = valori[nome] ?? '';
    r.commit();
  }
  const finale = path.join(dir, nomeFile);
  const tmp = path.join(dir, `.${nomeFile}.tmp`);
  await wb.xlsx.writeFile(tmp);
  await fs.rename(tmp, finale);
}
