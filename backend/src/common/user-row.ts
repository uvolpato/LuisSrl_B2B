import type { User } from '@prisma/client';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  nome: string;
  ruolo: string;
  stato: User['stato'];
  preferred_language: string;
  must_change_password: boolean;
  avatar_color: string;
  group_id: number | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
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
  groupId: number | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export function rowToProfile(r: UserRow): UserProfile {
  return {
    id: r.id,
    email: r.email,
    nome: r.nome,
    userType: 'admin',
    ruolo: r.ruolo,
    stato: r.stato,
    preferredLanguage: r.preferred_language,
    mustChangePassword: r.must_change_password,
    avatarColor: r.avatar_color,
    groupId: r.group_id,
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
  };
}

export function userToProfile(u: User): UserProfile {
  return {
    id: u.id,
    email: u.email,
    nome: u.nome,
    userType: 'admin',
    ruolo: u.ruolo,
    stato: u.stato,
    preferredLanguage: u.preferredLanguage,
    mustChangePassword: u.mustChangePassword,
    avatarColor: u.avatarColor,
    groupId: u.groupId,
    deletedAt: u.deletedAt,
    createdAt: u.createdAt,
  };
}
