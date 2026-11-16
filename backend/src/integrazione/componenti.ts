/**
 * Riconosce i figli di una composizione ("kit") dal codice Integra: il padre è
 * il codice che ha davanti, i figli hanno suffisso a 5 cifre (`MC108886-08611`).
 * Il trattino da solo non basta (i codici normali lo usano per colori e varianti:
 * `AL21-19004`, `PTD100440-61`), quindi il padre deve esistere davvero.
 */
const SUFFISSO_FIGLIO = /^(.+)-\d{5}$/;

export function candidatoPadre(codice: string): string | null {
  const m = SUFFISSO_FIGLIO.exec(codice.trim());
  return m ? m[1] : null;
}

export function padreComponente(codice: string, esistePadre: (padre: string) => boolean): string | null {
  const padre = candidatoPadre(codice);
  return padre && esistePadre(padre) ? padre : null;
}

export type VarianteConComposizione = {
  codice: string;
  componenti?: { descrizione: string; dimensioni?: string | null; quantita: number }[];
};

/** Blocco di contesto per il prompt AI: pezzi dei kit, se ce ne sono. */
export function promptComposizione(varianti: VarianteConComposizione[]): string {
  const kit = varianti.filter((v) => v.componenti?.length);
  if (!kit.length) return '';
  const righe = kit.map((v) => {
    const pezzi = v.componenti!
      .map((c) => `${c.quantita > 1 ? `${c.quantita}× ` : ''}${c.descrizione}${c.dimensioni ? ` (${c.dimensioni})` : ''}`)
      .join('; ');
    return `- Kit ${v.codice}: ${pezzi}`;
  });
  return `\n\nComposizione dei kit (i pezzi si vendono solo insieme, prezzo e giacenza sono del codice kit):\n${righe.join('\n')}`;
}
