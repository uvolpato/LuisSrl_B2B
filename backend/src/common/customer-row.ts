import type { Customer } from '@prisma/client';

export interface CustomerRow {
  id: number;
  email: string;
  password_hash: string;
  nome: string;
  ragione_sociale: string | null;
  partita_iva: string | null;
  telefono: string | null;
  ruolo: string;
  stato: Customer['stato'];
  preferred_language: string;
  must_change_password: boolean;
  avatar_color: string;
  created_at: Date;
  updated_at: Date;
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
  stato: Customer['stato'];
  preferredLanguage: string;
  mustChangePassword: boolean;
  avatarColor: string;
  createdAt: Date;
}

export function customerRowToProfile(r: CustomerRow): CustomerProfile {
  return {
    id: r.id,
    email: r.email,
    nome: r.nome,
    userType: 'customer',
    ragioneSociale: r.ragione_sociale,
    partitaIva: r.partita_iva,
    telefono: r.telefono,
    ruolo: r.ruolo,
    stato: r.stato,
    preferredLanguage: r.preferred_language,
    mustChangePassword: r.must_change_password,
    avatarColor: r.avatar_color,
    createdAt: r.created_at,
  };
}

export function customerToProfile(c: Customer): CustomerProfile {
  return {
    id: c.id,
    email: c.email,
    nome: c.nome,
    userType: 'customer',
    ragioneSociale: c.ragioneSociale,
    partitaIva: c.partitaIva,
    telefono: c.telefono,
    ruolo: c.ruolo,
    stato: c.stato,
    preferredLanguage: c.preferredLanguage,
    mustChangePassword: c.mustChangePassword,
    avatarColor: c.avatarColor,
    createdAt: c.createdAt,
  };
}
