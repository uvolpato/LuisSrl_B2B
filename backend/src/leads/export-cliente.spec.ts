import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import ExcelJS from 'exceljs';
import type { Lead } from '@prisma/client';
import { scriviXlsxAtomico } from '../common/xlsx';
import {
  COLONNE_CLIENTI,
  ETICHETTE_CLIENTI,
  formattaIndirizzo,
  rigaCliente,
} from './export-cliente';

// Dati del modello cli.xlsx fornito da AGOMIR (GARDEN ORCHIDEA SRL).
const lead = {
  id: 9,
  ragioneSociale: 'Garden Orchidea SRL',
  partitaIva: '03232000137',
  codiceFiscale: null,
  telefono: '039 9943129',
  sedeIndirizzo: 'VIA STATALE 47',
  sedeCap: '23881',
  sedeCitta: 'AIRUNO',
  sedeProvincia: 'LC',
} as unknown as Lead;

describe('Export anagrafica cliente verso Integra', () => {
  it('riga identica al modello AGOMIR (codice vuoto: lo assegna Integra)', () => {
    expect(rigaCliente(lead)).toEqual([
      'C',
      '',
      'GARDEN ORCHIDEA SRL ',
      'GARDEN ORCHIDEA SRL',
      '',
      'VIA STATALE, 47',
      '',
      '23881',
      'AIRUNO',
      'LC',
      '--',
      '--',
      '086',
      'ITALIA',
      '039 9943129',
      '',
      '03232000137',
      '03232000137',
    ]);
    expect(rigaCliente(lead)).toHaveLength(COLONNE_CLIENTI.length);
  });

  it('virgola prima del civico solo se c e un numero finale', () => {
    expect(formattaIndirizzo('via bellafino 28/30')).toBe(
      'VIA BELLAFINO, 28/30',
    );
    expect(formattaIndirizzo('VIA STATALE, 47')).toBe('VIA STATALE, 47');
    expect(formattaIndirizzo('LOCALITA PRATI')).toBe('LOCALITA PRATI');
    expect(formattaIndirizzo(null)).toBe('');
  });

  it('scrive il file con le due righe di testata e senza temporanei residui', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'lead-export-'));
    try {
      await scriviXlsxAtomico(dir, 'lead-9.xlsx', [
        [...COLONNE_CLIENTI],
        [...ETICHETTE_CLIENTI],
        rigaCliente(lead),
      ]);
      expect(await readdir(dir)).toEqual(['lead-9.xlsx']);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(path.join(dir, 'lead-9.xlsx'));
      const ws = wb.worksheets[0];
      expect(ws.getRow(1).getCell(1).value).toBe('cla_tipo');
      expect(ws.getRow(2).getCell(18).value).toBe('P. IVA');
      expect(ws.getRow(3).getCell(4).value).toBe('GARDEN ORCHIDEA SRL');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
