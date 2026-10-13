import type { Lead } from '@prisma/client';

/**
 * Tracciato import soggetti Integra (modello Soggetti.xls fornito da AGOMIR, ottobre 2026):
 * 43 colonne, una riga di intestazione, poi i dati. Generato in .xlsx (confermato da AGOMIR).
 */
export const COLONNE_CLIENTI = [
  'CLA_TIPO',
  'CLA_CODSTR',
  'CLA_CLIRGSOC',
  'CLA_CLIINDIR',
  'CLA_CLICAP',
  'CLA_CLICITTA',
  'CLA_CLIPROV',
  'CLA_CLIPIVA',
  'CLA_CLICFISC',
  'CLA_VALCOD',
  'CLA_RBOL',
  'CLA_ALLIVA',
  'ILE_NUREG',
  'ILE_DTAUT',
  'ILE_NUAUT',
  'CLA_IVASOSP',
  'CLA_CLITEL',
  'CLA_CLIFAX',
  'CLA_ABICOD',
  'CLA_CABCOD',
  'CLA_CLIEMAIL',
  'STA_CODISO',
  'CLA_ESCL01',
  'CLA_ESCL02',
  'CLA_ESCL03',
  'CLA_ESCL04',
  'CLA_ESCL05',
  'CLA_ESCL06',
  'CLA_ESCL07',
  'CLA_ESCL08',
  'CLA_ESCL09',
  'CLA_ESCL10',
  'CLA_ESCL11',
  'CLA_ESCL12',
  'CLA_CACCOD',
  'CLA_ABICODNS',
  'CLA_CABCODNS',
  'ILE_ID',
  'ILE_TIPOES',
  'CLA_ENTCOD',
  'CLA_ETTCOD',
  'CLA_CLIPECDEST',
  'CLA_CLICODDEST',
] as const;

type Colonna = (typeof COLONNE_CLIENTI)[number];

/**
 * Valori fissi per ogni nuovo cliente, presi dall'esempio AGOMIR.
 * DA CONFERMARE con AGOMIR (CLA_CACCOD = CC01 indicato da Luis il 2026-10-13).
 */
export const VALORI_FISSI: Partial<Record<Colonna, string>> = {
  CLA_TIPO: 'C',
  CLA_VALCOD: 'EUR',
  CLA_RBOL: '1',
  CLA_ALLIVA: '1',
  ILE_NUREG: '0',
  CLA_IVASOSP: 'I',
  CLA_ABICOD: '00000',
  CLA_CABCOD: '00000',
  STA_CODISO: '--',
  CLA_ESCL01: 'N',
  CLA_ESCL02: 'N',
  CLA_ESCL03: 'N',
  CLA_ESCL04: 'N',
  CLA_ESCL05: 'N',
  CLA_ESCL06: 'N',
  CLA_ESCL07: 'N',
  CLA_ESCL08: 'N',
  CLA_ESCL09: 'N',
  CLA_ESCL10: 'N',
  CLA_ESCL11: 'N',
  CLA_ESCL12: 'N',
  CLA_CACCOD: 'CC01',
  CLA_ABICODNS: '00000',
  CLA_CABCODNS: '00000',
  ILE_ID: '0',
  ILE_TIPOES: 'per',
  CLA_ENTCOD: 'SOG',
  CLA_ETTCOD: 'RAGS',
};

/** Dati anagrafici da esportare: da un lead approvato oggi, da un cliente (con SDI/PEC) alla riesportazione. */
export interface AnagraficaIntegra {
  /** Vuoto per i nuovi: lo assegna Integra; l'aggancio successivo avviene per P.IVA. */
  codiceCliente?: string | null;
  ragioneSociale: string;
  partitaIva: string;
  codiceFiscale?: string | null;
  indirizzo?: string | null;
  cap?: string | null;
  citta?: string | null;
  provincia?: string | null;
  telefono?: string | null;
  email?: string | null;
  pec?: string | null;
  sdi?: string | null;
}

const up = (s: string | null | undefined) =>
  (s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
const t = (s: string | null | undefined) => (s ?? '').trim();

/** "VIA STATALE 47" → "VIA STATALE, 47" (come le anagrafiche esistenti in Integra). */
export function formattaIndirizzo(s: string | null | undefined): string {
  const v = up(s);
  return v.replace(/^(.*[^\d,\s])\s+(\d+\S*)$/, '$1, $2');
}

/** Riga dati del tracciato, nell'ordine di COLONNE_CLIENTI. Solo clienti italiani; C.F. = P.IVA se non indicato. */
export function rigaCliente(a: AnagraficaIntegra): string[] {
  const valori: Partial<Record<Colonna, string>> = {
    ...VALORI_FISSI,
    CLA_CODSTR: t(a.codiceCliente),
    CLA_CLIRGSOC: up(a.ragioneSociale),
    CLA_CLIINDIR: formattaIndirizzo(a.indirizzo),
    CLA_CLICAP: t(a.cap),
    CLA_CLICITTA: up(a.citta),
    CLA_CLIPROV: up(a.provincia),
    CLA_CLIPIVA: t(a.partitaIva),
    CLA_CLICFISC: up(a.codiceFiscale) || t(a.partitaIva),
    CLA_CLITEL: t(a.telefono),
    CLA_CLIEMAIL: t(a.email).toLowerCase(),
    CLA_CLIPECDEST: t(a.pec).toLowerCase(),
    CLA_CLICODDEST: up(a.sdi),
  };
  return COLONNE_CLIENTI.map((c) => valori[c] ?? '');
}

/** Anagrafica di un lead approvato: sede da VIES/web, email del referente; SDI/PEC arrivano dopo. */
export function anagraficaDaLead(lead: Lead): AnagraficaIntegra {
  return {
    ragioneSociale: lead.ragioneSociale,
    partitaIva: lead.partitaIva,
    codiceFiscale: lead.codiceFiscale,
    indirizzo: lead.sedeIndirizzo,
    cap: lead.sedeCap,
    citta: lead.sedeCitta,
    provincia: lead.sedeProvincia,
    telefono: lead.telefono,
    email: lead.email,
  };
}
