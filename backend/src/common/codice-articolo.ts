/**
 * Il codice linea è la chiave dell'articolo e finisce nei path delle URL
 * (`/area/catalogo/<codice>`, `POST /api/integrazione/articoli/<codice>`, link
 * condivisi): una `/` o un carattere riservato rompe routing e link.
 * Quindi si normalizza all'import, mentre il codice Integra della variante
 * (quello che va negli ordini) resta intatto.
 *
 * shortcut: due codici diversi possono normalizzarsi uguale (raro, es.
 * `linea_A/B` e `linea_A-B`): il portale li vedrebbe come un solo articolo.
 * Se succede, aggiungere un suffisso univoco invece del solo separatore.
 */
export function codiceLineaSicuro(codice: string): string {
  const pulito = codice.trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return pulito || 'ARTICOLO';
}
