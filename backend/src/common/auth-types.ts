import type { User, Customer } from '@prisma/client';

export interface AuthUser {
  id: number;
  email: string;
  nome: string;
  userType: 'admin' | 'customer';
  ruolo: string;
  stato: string;
  avatarColor: string;
}

export interface UserProfile {
  id: number;
  email: string;
  nome: string;
  userType: 'admin';
  ruolo: string;
  stato: User['stato'];
  preferredLanguage: string;
  mustChangePassword: boolean;
  avatarColor: string;
  bio: string | null;
  gender: string | null;
  birthDate: Date | null;
  groupId: number | null;
  deletedAt: Date | null;
  createdAt: Date;
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
  stato: Customer['stato'];
  preferredLanguage: string;
  mustChangePassword: boolean;
  avatarColor: string;
  createdAt: Date;
  codiceCliente?: string | null;
  codiceListino?: string | null;
  indirizzo?: string | null;
  cap?: string | null;
  citta?: string | null;
  provincia?: string | null;
  codicePagamento?: string | null;
  codicePagamentoDescrizione?: string | null;
  invitatoAt?: Date | null;
  fido?: number | null;
  numOrdini?: number;
  numOrdiniAnno?: number;
}

export function toUserProfile(u: {
  id: number; email: string; nome: string; ruolo: string; stato: User['stato'];
  preferredLanguage: string; mustChangePassword: boolean; avatarColor: string;
  bio: string | null; gender: string | null; birthDate: Date | null;
  groupId: number | null; deletedAt: Date | null; createdAt: Date;
}): UserProfile {
  return {
    id: u.id, email: u.email, nome: u.nome, userType: 'admin', ruolo: u.ruolo,
    stato: u.stato, preferredLanguage: u.preferredLanguage, mustChangePassword: u.mustChangePassword,
    avatarColor: u.avatarColor, bio: u.bio, gender: u.gender, birthDate: u.birthDate,
    groupId: u.groupId, deletedAt: u.deletedAt, createdAt: u.createdAt,
  };
}

export function toCustomerProfile(u: {
  id: number; email: string; nome: string; ruolo: string; stato: Customer['stato'];
  preferredLanguage: string; mustChangePassword: boolean; avatarColor: string;
  ragioneSociale: string | null; partitaIva: string | null; telefono: string | null;
  telefonoFisso: string | null; sitoWeb: string | null;
  codiceCliente?: string | null; codiceListino?: string | null;
  indirizzo?: string | null; cap?: string | null; citta?: string | null; provincia?: string | null;
  codicePagamento?: string | null; fido?: unknown; invitatoAt?: Date | null;
  createdAt: Date;
}): CustomerProfile {
  return {
    id: u.id, email: u.email, nome: u.nome, userType: 'customer',
    ragioneSociale: u.ragioneSociale, partitaIva: u.partitaIva, telefono: u.telefono,
    telefonoFisso: u.telefonoFisso, sitoWeb: u.sitoWeb,
    ruolo: u.ruolo, stato: u.stato, preferredLanguage: u.preferredLanguage,
    mustChangePassword: u.mustChangePassword, avatarColor: u.avatarColor, createdAt: u.createdAt,
    codiceCliente: u.codiceCliente ?? null,
    codiceListino: u.codiceListino ?? null,
    indirizzo: u.indirizzo ?? null,
    cap: u.cap ?? null,
    citta: u.citta ?? null,
    provincia: u.provincia ?? null,
    codicePagamento: u.codicePagamento ?? null,
    fido: u.fido != null ? Number(u.fido) : null,
    invitatoAt: u.invitatoAt ?? null,
  };
}
