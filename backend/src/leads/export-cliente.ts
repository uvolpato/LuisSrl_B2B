import type { Lead } from '@prisma/client';

/**
 * Tracciato import soggetti Integra: il **modello è l'export reale di Integra**
 * (`expcla.xlsx`, fornito a novembre 2026) ripulito della riga di esempio.
 * Il file generato conserva le sue due righe di intestazione (nomi `cla_*` e
 * etichette italiane) e accoda i dati da riga 3: i valori sono indicizzati per
 * nome colonna, quindi posizioni e colonne nuove di Integra non rompono il mapping.
 *
 * I campi non gestiti dal portale (pagamento, listino, agente, porto, spedizione,
 * categoria contabile, tipo fatturazione, minimo fatturabile, IBAN, PEC/SDI) vanno
 * **vuoti**: li completa Integra.
 */

/** Modello versionato (solo intestazioni, nessun dato di cliente). */
export const MODELLO_SOGGETTI = 'templates/integra-soggetti.xlsx';
/**
 * Righe di intestazione da tenere nel file generato: **solo la prima** (nomi
 * tecnici `cla_*`). La seconda riga del modello — le etichette italiane — serve
 * solo a leggere l'export di Integra e viene scartata.
 */
export const RIGHE_INTESTAZIONE_MODELLO = 1;

/**
 * Valori tecnici presi dalla riga di esempio di Integra (identitari del soggetto,
 * non commerciali). I campi commerciali restano vuoti: vedi commento sopra.
 */
export const VALORI_FISSI: Record<string, string | number> = {
  cla_tipo: 'C',
  cla_cliregcod: '--',
  cla_cliregdescr: '--',
  cla_clistacod: '086',
  cla_clistadescr: 'ITALIA',
  cla_ggfinemese: 0,
  cla_ggesclusi: 0,
  cla_abicod: '--',
  cla_abidescr: '--',
  cla_cabcod: '--',
  cla_cabdescr: '--',
  cla_alliva: '1',
  cla_ivacod: '--',
  cla_ivadescr: '--',
  cla_postcons: 0,
  cla_valcod: 'EUR',
  cla_valdescr: 'EURO',
  cla_ivasosp: 'I',
  cla_rbol: '1',
  cla_nomcomb: '0',
  cla_flganticipoprovv: 'N',
};

/** Dati anagrafici da esportare: da un lead approvato, o da un cliente (riesportazione). */
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
  fax?: string | null;
  email?: string | null;
}

const up = (s: string | null | undefined) =>
  (s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
const t = (s: string | null | undefined) => (s ?? '').trim();
/** Solo clienti italiani: P.IVA sempre come 11 cifre (Integra puo' averla con prefisso IT). */
const piva = (s: string | null | undefined) => {
  const cifre = (s ?? '').replace(/\D/g, '');
  return cifre.length === 11 ? cifre : t(s);
};

/** "VIA STATALE 47" → "VIA STATALE, 47" (come le anagrafiche esistenti in Integra). */
export function formattaIndirizzo(s: string | null | undefined): string {
  const v = up(s);
  return v.replace(/^(.*[^\d,\s])\s+(\d+\S*)$/, '$1, $2');
}

/**
 * Colonne in **rosso** nel modello di Integra: vanno sempre valorizzate.
 * `cla_codstr` è il codice soggetto (lo assegna Integra per i nuovi) e
 * `cla_cliindir2` è il secondo indirizzo, che il portale non gestisce: restano
 * vuoti per i soggetti nuovi.
 */
export const CAMPI_OBBLIGATORI = [
  'cla_tipo',
  'cla_codstr',
  'cla_cliallrgsoc',
  'cla_cliindir',
  'cla_cliindir2',
  'cla_clicap',
  'cla_clicitta',
  'cla_cliprov',
  'cla_clistacod',
  'cla_clistadescr',
  'cla_clicfisc',
  'cla_clipiva',
] as const;

/** Colonne in **verde** (opzionali): restano vuote, le completa Integra. */
export const CAMPI_OPZIONALI = [
  'cla_caccod',
  'cla_pagcod',
  'cla_iban',
  'cla_agecod',
  'cla_agedescr',
  'cla_porcod',
  'cla_pordescr',
  'cla_specod',
  'cla_spedescr',
] as const;

/** Obbligatori non compilabili dal portale: codice nuovo soggetto e secondo indirizzo. */
const OBBLIGATORI_NON_GESTITI = new Set<string>(['cla_codstr', 'cla_cliindir2']);

/**
 * Campi obbligatori senza valore: se ce ne sono il file non va scritto, altrimenti
 * finirebbe nella cartella di Integra un tracciato che l'import rifiuta.
 */
export function campiObbligatoriMancanti(v: Record<string, string | number>): string[] {
  return CAMPI_OBBLIGATORI.filter(
    (c) => !OBBLIGATORI_NON_GESTITI.has(c) && String(v[c] ?? '').trim() === '',
  );
}

/** Valori per nome colonna del modello. C.F. = P.IVA se non indicato. */
export function valoriCliente(a: AnagraficaIntegra): Record<string, string | number> {
  return {
    ...VALORI_FISSI,
    cla_codstr: t(a.codiceCliente),
    cla_cliallrgsoc: up(a.ragioneSociale),
    cla_cliindir: formattaIndirizzo(a.indirizzo),
    cla_clicap: t(a.cap),
    cla_clicitta: up(a.citta),
    cla_cliprov: up(a.provincia),
    cla_clicfisc: up(a.codiceFiscale) || piva(a.partitaIva),
    cla_clipiva: piva(a.partitaIva),
    cla_clitel: t(a.telefono),
    cla_clifax: t(a.fax),
    cla_cliemail: t(a.email).toLowerCase(),
  };
}

/**
 * Nome del file di export: l'import in Integra lo fa una persona, quindi il nome
 * deve dire chi è il soggetto — `lead-12-GARDEN-DEMO-SRL.xlsx`.
 */
export function nomeFileLead(lead: { id: number; ragioneSociale: string }): string {
  const nome = (lead.ragioneSociale ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // via gli accenti
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return nome ? `lead-${lead.id}-${nome}.xlsx` : `lead-${lead.id}.xlsx`;
}

/** Anagrafica di un lead approvato: sede da VIES/web, email del referente. */export function anagraficaDaLead(lead: Lead): AnagraficaIntegra {
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

/** Anagrafica di un cliente gia' in Integra (riesportazione dopo la conferma dei dati di fatturazione). */
export function anagraficaDaCliente(c: {
  codiceCliente: string | null;
  ragioneSociale: string | null;
  nome: string;
  partitaIva: string | null;
  codiceFiscale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  telefono: string | null;
  email: string;
  pec: string | null;
  codiceSdi: string | null;
}): AnagraficaIntegra {
  // PEC e SDI non hanno colonna in questo tracciato: restano gestiti da Integra.
  void c.pec;
  void c.codiceSdi;
  return {
    codiceCliente: c.codiceCliente,
    ragioneSociale: c.ragioneSociale || c.nome,
    partitaIva: c.partitaIva ?? '',
    codiceFiscale: c.codiceFiscale,
    indirizzo: c.indirizzo,
    cap: c.cap,
    citta: c.citta,
    provincia: c.provincia,
    telefono: c.telefono,
    email: c.email,
  };
}
