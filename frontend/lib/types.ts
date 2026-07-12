export interface UserProfile {
  id: number;
  email: string;
  nome: string;
  userType: 'admin';
  ruolo: "SUPERUSER" | "AMMINISTRATORE" | "UTENTE" | "SOSPESO";
  stato: "ATTIVO" | "BLOCCATO";
  preferredLanguage: string;
  mustChangePassword: boolean;
  avatarColor: string;
  bio: string | null;
  gender: string | null;
  birthDate: string | null;
  groupId: number | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface CustomerProfile {
  id: number;
  email: string;
  nome: string;
  userType: 'customer';
  ragioneSociale: string | null;
  partitaIva: string | null;
  telefono: string | null;
  telefonoFisso: string | null;
  sitoWeb: string | null;
  ruolo: string;
  stato: "ATTIVO" | "BLOCCATO";
  preferredLanguage: string;
  mustChangePassword: boolean;
  avatarColor: string;
  createdAt: string;
  codiceCliente?: string | null;
  codiceListino?: string | null;
  indirizzo?: string | null;
  cap?: string | null;
  citta?: string | null;
  provincia?: string | null;
  codicePagamento?: string | null;
  codicePagamentoDescrizione?: string | null;
  fido?: number | null;
  numOrdini?: number;
  numOrdiniAnno?: number;
  invitatoAt?: string | null;
}

export interface IndirizzoCliente {
  id: number;
  customerId: number;
  ragioneSociale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  flagSpedizione: boolean;
}

export interface ContattoCliente {
  id: number;
  customerId: number;
  tipo: "EMAIL" | "TELEFONO" | "NOTA";
  data: string;
  contenuto: string;
}

export interface RigaOrdine {
  id: number;
  ordineId: number;
  numeroRiga?: number | null;
  codiceProdotto: string | null;
  descrizione: string | null;
  quantita: string | null;
  prezzo: string | null;
}

export interface OrdineCliente {
  id: number;
  numeroOrdine: string;
  dataOrdine: string | null;
  customerId: number;
  importoTotale: string | null;
  stato: string | null;
  indirizzoSpedizioneId?: number | null;
  codicePorto?: string | null;
  codiceSpedizione?: string | null;
  codiceVettore?: string | null;
  codicePagamento?: string | null;
  notaSpedizione?: string | null;
  notaOrdine?: string | null;
  righe: RigaOrdine[];
}

export interface OrdiniResponse {
  items: OrdineCliente[];
  total: number;
  years: number[];
}

export interface MeResponse {
  user: UserProfile | CustomerProfile;
  csrfToken: string;
}

export interface UserListResponse {
  items: UserProfile[];
  total: number;
}

export interface CustomerListResponse {
  items: CustomerProfile[];
  total: number;
}

export interface ProvisionalPasswordResponse {
  user: UserProfile;
  provisionalPassword: string;
}

export interface PermissionGroup {
  id: number;
  name: string;
  slug: string;
  permissions: string[];
  _count: { users: number };
  createdAt: string;
}
