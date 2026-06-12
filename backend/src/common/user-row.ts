import type { User } from '@prisma/client';

/** Riga `users` cosi' come la restituiscono le stored procedure (snake_case). */
export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  nome: string;
  ragione_sociale: string | null;
  partita_iva: string | null;
  telefono: string | null;
  ruolo: User['ruolo'];
  stato: User['stato'];
  preferred_language: string;
  must_change_password: boolean;
  created_at: Date;
  updated_at: Date;
}

/** Profilo utente esposto dalle API (mai l'hash password). */
export interface UserProfile {
  id: number;
  email: string;
  nome: string;
  ragioneSociale: string | null;
  partitaIva: string | null;
  telefono: string | null;
  ruolo: User['ruolo'];
  stato: User['stato'];
  preferredLanguage: string;
  mustChangePassword: boolean;
  createdAt: Date;
}

export function rowToProfile(r: UserRow): UserProfile {
  return {
    id: r.id,
    email: r.email,
    nome: r.nome,
    ragioneSociale: r.ragione_sociale,
    partitaIva: r.partita_iva,
    telefono: r.telefono,
    ruolo: r.ruolo,
    stato: r.stato,
    preferredLanguage: r.preferred_language,
    mustChangePassword: r.must_change_password,
    createdAt: r.created_at,
  };
}

export function userToProfile(u: User): UserProfile {
  return {
    id: u.id,
    email: u.email,
    nome: u.nome,
    ragioneSociale: u.ragioneSociale,
    partitaIva: u.partitaIva,
    telefono: u.telefono,
    ruolo: u.ruolo,
    stato: u.stato,
    preferredLanguage: u.preferredLanguage,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
  };
}
