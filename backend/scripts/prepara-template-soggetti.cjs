/**
 * Prepara il modello di export soggetti per Integra a partire da un export reale
 * (`expcla.xlsx` fornito da Integra): tiene SOLO le prime due righe di intestazione
 * (nomi tecnici `cla_*` + etichette italiane) ed elimina la riga di esempio, che
 * contiene i dati di un cliente reale (P.IVA, IBAN, email).
 *
 * Uso: node scripts/prepara-template-soggetti.cjs "C:\\percorso\\expcla.xlsx"
 * Output: templates/integra-soggetti.xlsx  (versionato)
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const RIGHE_INTESTAZIONE = 2;

(async () => {
  const sorgente = process.argv[2];
  if (!sorgente || !fs.existsSync(sorgente)) {
    console.error('Indica il file di export Integra: node scripts/prepara-template-soggetti.cjs <file.xlsx>');
    process.exit(1);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(sorgente);
  const ws = wb.worksheets[0];
  if (ws.rowCount > RIGHE_INTESTAZIONE) {
    ws.spliceRows(RIGHE_INTESTAZIONE + 1, ws.rowCount - RIGHE_INTESTAZIONE);
  }
  const outDir = path.join(__dirname, '..', 'templates');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'integra-soggetti.xlsx');
  await wb.xlsx.writeFile(out);
  const nomi = [];
  ws.getRow(1).eachCell({ includeEmpty: false }, (c) => nomi.push(String(c.value).trim()));
  console.log(`Modello scritto in ${out} (${nomi.length} colonne, ${ws.rowCount} righe)`);
  console.log(nomi.join(', '));
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
