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

export interface PermissionGroup {
  id: number;
  name: string;
  slug: string;
  permissions: string[];
  _count: { users: number };
  createdAt: string;
}
