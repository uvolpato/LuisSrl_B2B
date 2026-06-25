export interface ArticleVariant {
  codice: string;
  descIntegra?: string;
  dim1?: { nome: string; val: string } | null;
  dim2?: { nome: string; val: string } | null;
  multiplo?: number;
  giacenza?: number;
  prezzo?: number;
  stato?: string;
}

export interface Article {
  id: string;
  name: string;
  colore: string;
  coloreRgb?: string;
  famigliaPrincipale?: string;
  raccolte?: string[];
  stato: "attivo" | "nascosto";
  img?: string;
  varianti?: ArticleVariant[];
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
