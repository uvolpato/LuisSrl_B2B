/** Tipi condivisi delle risposte API. */

export interface UserProfile {
  id: number;
  email: string;
  nome: string;
  ragioneSociale: string | null;
  partitaIva: string | null;
  telefono: string | null;
  ruolo: "ADMIN" | "CLIENTE";
  stato: "ATTIVO" | "BLOCCATO";
  preferredLanguage: string;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface MeResponse {
  user: UserProfile;
  csrfToken: string;
}

export interface UserListResponse {
  items: UserProfile[];
  total: number;
}

export interface ProvisionalPasswordResponse {
  user: UserProfile;
  provisionalPassword: string;
}
