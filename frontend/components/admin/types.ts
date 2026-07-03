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
  configurato?: boolean;
}

export interface ProdottoView {
  codice: string;
  descrizione: string;
  modificabile: string;
  cl1Cod: string; cl1Descr: string; cl1Val: string;
  cl2Cod: string; cl2Descr: string; cl2Val: string;
  cl3Cod: string; cl3Descr: string; cl3Val: string;
  funzionalita: string;
  famigliaId: number;
}

export interface SearchResult {
  items: ProdottoView[];
  total: number;
  page: number;
  limit: number;
}

export const PAGE_SIZE = 20;
