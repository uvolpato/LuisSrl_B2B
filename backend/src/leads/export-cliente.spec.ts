import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import ExcelJS from 'exceljs';
import type { Lead } from '@prisma/client';
import { scriviXlsxDaModello } from '../common/xlsx';
import {
  MODELLO_SOGGETTI,
  RIGHE_INTESTAZIONE_MODELLO,
  anagraficaDaLead,
  formattaIndirizzo,
  nomeFileLead,
  valoriCliente,
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

const modello = path.join(process.cwd(), MODELLO_SOGGETTI);

describe('Export anagrafica cliente verso Integra (modello export Integra)', () => {
  it('valori: anagrafica, denominazione su cla_cliallrgsoc, campi commerciali vuoti', () => {
    const v = valoriCliente(anagraficaDaLead(lead));
    expect(v.cla_tipo).toBe('C');
    expect(v.cla_codstr).toBe('');
    expect(v.cla_cliallrgsoc).toBe('GARDEN DEMO SRL');
    expect(v.cla_cliindir).toBe('VIA STATALE, 47');
    expect(v.cla_clicap).toBe('23881');
    expect(v.cla_clicitta).toBe('AIRUNO');
    expect(v.cla_cliprov).toBe('LC');
    expect(v.cla_clicfisc).toBe('09012345678');
    expect(v.cla_clipiva).toBe('09012345678');
    expect(v.cla_cliemail).toBe('info@garden-demo.example');
    expect(v.cla_clistacod).toBe('086');
    expect(v.cla_clistadescr).toBe('ITALIA');
    // da completare in Integra: non li scriviamo
    for (const campo of ['cla_pagcod', 'cla_tlscod', 'cla_agecod', 'cla_porcod', 'cla_specod', 'cla_caccod', 'cla_tipofatt', 'cla_minfat', 'cla_iban']) {
      expect(v[campo]).toBeUndefined();
    }
  });

  it('riesportazione: codice cliente e P.IVA normalizzata', () => {
    const v = valoriCliente({
      ...anagraficaDaLead(lead),
      codiceCliente: '07420',
      partitaIva: 'IT09012345678',
    });
    expect(v.cla_codstr).toBe('07420');
    expect(v.cla_clipiva).toBe('09012345678');
  });

  it('nome file con la ragione sociale, per l import manuale', () => {
    expect(nomeFileLead({ id: 12, ragioneSociale: 'Garden Demo srl' })).toBe('lead-12-GARDEN-DEMO-SRL.xlsx');
    expect(nomeFileLead({ id: 7, ragioneSociale: 'F.lli Rossi & C. s.n.c.' })).toBe('lead-7-F-LLI-ROSSI-C-S-N-C.xlsx');
    expect(nomeFileLead({ id: 3, ragioneSociale: 'Société Très Longue Dénomination Pour Les Jardins du Sud' }))
      .toHaveLength('lead-3-'.length + 40 + '.xlsx'.length);
    expect(nomeFileLead({ id: 5, ragioneSociale: '   ' })).toBe('lead-5.xlsx');
  });

  it('virgola prima del civico solo se c e un numero finale', () => {    expect(formattaIndirizzo('via bellafino 28/30')).toBe('VIA BELLAFINO, 28/30');
    expect(formattaIndirizzo('VIA STATALE, 47')).toBe('VIA STATALE, 47');
    expect(formattaIndirizzo('LOCALITA PRATI')).toBe('LOCALITA PRATI');
    expect(formattaIndirizzo(null)).toBe('');
  });

  it('file: due righe di intestazione dall export Integra, dati da riga 3, nessun temporaneo', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'lead-export-'));
    try {
      await scriviXlsxDaModello(dir, nomeFileLead(lead), modello, RIGHE_INTESTAZIONE_MODELLO, [
        valoriCliente(anagraficaDaLead(lead)),
      ]);
      expect(await readdir(dir)).toEqual([nomeFileLead(lead)]);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(path.join(dir, nomeFileLead(lead)));
      const ws = wb.worksheets[0];
      expect(ws.rowCount).toBe(3);
      // riga 1 = nomi tecnici, riga 2 = etichette italiane, riga 3 = dati
      expect(ws.getRow(1).getCell(3).value).toBe('cla_cliallrgsoc');
      expect(ws.getRow(2).getCell(3).value).toBe('Denominazione');
      expect(ws.getRow(3).getCell(3).value).toBe('GARDEN DEMO SRL');
      expect(ws.getRow(3).getCell(1).value).toBe('C');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
