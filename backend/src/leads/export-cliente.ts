import type { Lead } from '@prisma/client';

/** Tracciato import anagrafica clienti Integra (modello cli.xlsx fornito da AGOMIR): 2 righe di testata. */
export const COLONNE_CLIENTI = [
  'cla_tipo',
  'cla_codstr',
  'cla_cliallrgsoc',
  'cla_clirgsoc',
  'cla_clirgsoc2',
  'cla_cliindir',
  'cla_cliindir2',
  'cla_clicap',
  'cla_clicitta',
  'cla_cliprov',
  'cla_cliregcod',
  'cla_cliregdescr',
  'cla_clistacod',
  'cla_clistadescr',
  'cla_clitel',
  'cla_clifax',
  'cla_clicfisc',
  'cla_clipiva',
] as const;

export const ETICHETTE_CLIENTI = [
  'T',
  'Codice',
  'Denominazione',
  'Denominazione',
  'Denominazione 2',
  'Indirizzo',
  'Indirizzo 2',
  'C.A.P.',
  'Città',
  'Provincia',
  'Cod. regione',
  'Regione',
  'Cod. stato',
  'Stato',
  'Telefono',
  'Fax',
  'C.F.',
  'P. IVA',
] as const;

const up = (s: string | null | undefined) =>
  (s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

/** "VIA STATALE 47" → "VIA STATALE, 47" (come le anagrafiche esistenti in Integra). */
export function formattaIndirizzo(s: string | null | undefined): string {
  const v = up(s);
  return v.replace(/^(.*[^\d,\s])\s+(\d+\S*)$/, '$1, $2');
}

/**
 * Riga dati del tracciato per un lead approvato (solo clienti italiani).
 * cla_codstr vuoto: il codice cliente lo assegna Integra in importazione.
 * Regione '--' e stato 086 ITALIA come nel modello; C.F. = P.IVA se non indicato.
 */
export function rigaCliente(lead: Lead): string[] {
  const rgsoc = up(lead.ragioneSociale);
  const rgsoc2 = '';
  return [
    'C',
    '',
    `${rgsoc} ${rgsoc2}`,
    rgsoc,
    rgsoc2,
    formattaIndirizzo(lead.sedeIndirizzo),
    '',
    lead.sedeCap ?? '',
    up(lead.sedeCitta),
    up(lead.sedeProvincia),
    '--',
    '--',
    '086',
    'ITALIA',
    (lead.telefono ?? '').trim(),
    '',
    up(lead.codiceFiscale) || lead.partitaIva,
    lead.partitaIva,
  ];
}
