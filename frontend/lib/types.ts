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
  groupId: number | null;
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
  ruolo: string;
  stato: "ATTIVO" | "BLOCCATO";
  preferredLanguage: string;
  mustChangePassword: boolean;
  avatarColor: string;
  createdAt: string;
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
