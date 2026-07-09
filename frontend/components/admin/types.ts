/** Immagine di ripiego per articoli/famiglie/raccolte senza foto. */
export const PLACEHOLDER_IMG = "/images/articoli/placeholder-vase.png";

export interface Article {
  articoloId?: number;
  id: string;
  name: string;
  descrizione?: string | null;
  colore: string;
  coloreRgb?: string;
  famigliaPrincipale?: string;
  raccolte?: string[];
  stato: "attivo" | "nascosto";
  img?: string;
  variantiCount?: number;
  variantiVisibiliCount?: number;
  configurato?: boolean;
}

export interface ProdottoView {
  codice: string;
  descrizione: string;
  famigliaCodice: string | null;
  famigliaNome: string | null;
  lineaCodice: string | null;
  lineaNome: string | null;
}

export interface SearchResult {
  items: ProdottoView[];
  total: number;
  page: number;
  limit: number;
}

export const PAGE_SIZE = 20;
