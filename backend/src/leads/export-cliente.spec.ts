import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import ExcelJS from 'exceljs';
import type { Lead } from '@prisma/client';
import { scriviXlsxAtomico } from '../common/xlsx';
import {
  COLONNE_CLIENTI,
  anagraficaDaLead,
  formattaIndirizzo,
  rigaCliente,
} from './export-cliente';

// Lead fittizio (dati demo, nessun soggetto reale).
const lead = {
  id: 9,
  ragioneSociale: 'Garden Demo srl',
  partitaIva: '09012345678',
  codiceFiscale: null,
  telefono: '039 1234567',
  email: 'Info@Garden-Demo.example',
  sedeIndirizzo: 'VIA STATALE 47',
  sedeCap: '23881',
  sedeCitta: 'AIRUNO',
  sedeProvincia: 'LC',
} as unknown as Lead;

const valore = (riga: string[], col: (typeof COLONNE_CLIENTI)[number]) =>
  riga[COLONNE_CLIENTI.indexOf(col)];

describe('Export anagrafica cliente verso Integra (tracciato Soggetti AGOMIR)', () => {
  it('43 colonne nell ordine del modello Soggetti.xls', () => {
    expect(COLONNE_CLIENTI).toHaveLength(43);
    expect(COLONNE_CLIENTI[0]).toBe('CLA_TIPO');
    expect(COLONNE_CLIENTI.slice(-2)).toEqual([
      'CLA_CLIPECDEST',
      'CLA_CLICODDEST',
    ]);
  });

  it('riga di un lead: dati anagrafici, valori fissi, codice vuoto, SDI/PEC vuoti', () => {
    const r = rigaCliente(anagraficaDaLead(lead));
    expect(r).toHaveLength(43);
    expect(valore(r, 'CLA_TIPO')).toBe('C');
    expect(valore(r, 'CLA_CODSTR')).toBe('');
    expect(valore(r, 'CLA_CLIRGSOC')).toBe('GARDEN DEMO SRL');
    expect(valore(r, 'CLA_CLIINDIR')).toBe('VIA STATALE, 47');
    expect(valore(r, 'CLA_CLICAP')).toBe('23881');
    expect(valore(r, 'CLA_CLIPROV')).toBe('LC');
    expect(valore(r, 'CLA_CLICFISC')).toBe('09012345678');
    expect(valore(r, 'CLA_CLIEMAIL')).toBe('info@garden-demo.example');
    expect(valore(r, 'CLA_CACCOD')).toBe('CC01');
    expect(valore(r, 'STA_CODISO')).toBe('--');
    expect(valore(r, 'CLA_ESCL12')).toBe('N');
    expect(valore(r, 'CLA_CLIPECDEST')).toBe('');
    expect(valore(r, 'CLA_CLICODDEST')).toBe('');
  });

  it('riesportazione: codice cliente, SDI maiuscolo e PEC', () => {
    const r = rigaCliente({
      ...anagraficaDaLead(lead),
      codiceCliente: '07420',
      sdi: 'm5uxcr1',
      pec: 'Garden@PEC.example',
    });
    expect(valore(r, 'CLA_CODSTR')).toBe('07420');
    expect(valore(r, 'CLA_CLICODDEST')).toBe('M5UXCR1');
    expect(valore(r, 'CLA_CLIPECDEST')).toBe('garden@pec.example');
  });

  it('virgola prima del civico solo se c e un numero finale', () => {
    expect(formattaIndirizzo('via bellafino 28/30')).toBe(
      'VIA BELLAFINO, 28/30',
    );
    expect(formattaIndirizzo('VIA STATALE, 47')).toBe('VIA STATALE, 47');
    expect(formattaIndirizzo('LOCALITA PRATI')).toBe('LOCALITA PRATI');
    expect(formattaIndirizzo(null)).toBe('');
  });

  it('scrive il file con una riga di intestazione e senza temporanei residui', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'lead-export-'));
    try {
      await scriviXlsxAtomico(dir, 'lead-9.xlsx', [
        [...COLONNE_CLIENTI],
        rigaCliente(anagraficaDaLead(lead)),
      ]);
      expect(await readdir(dir)).toEqual(['lead-9.xlsx']);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(path.join(dir, 'lead-9.xlsx'));
      const ws = wb.worksheets[0];
      expect(ws.rowCount).toBe(2);
      expect(ws.getRow(1).getCell(43).value).toBe('CLA_CLICODDEST');
      expect(ws.getRow(2).getCell(3).value).toBe('GARDEN DEMO SRL');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
