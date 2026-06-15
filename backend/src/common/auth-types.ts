/** Utente autenticato: admin (users) o cliente (customers). */
export interface AuthUser {
  id: number;
  email: string;
  nome: string;
  userType: 'admin' | 'customer';
  ruolo: string;
  stato: string;
  avatarColor: string;
}

/** Dati di login restituiti dalla SP auth.fn_login_lookup. */
export interface LoginLookupRow {
  user_id: number;
  user_type: 'admin' | 'customer';
  password_hash: string;
  nome: string;
  ruolo: string;
  stato: string;
  must_change_password: boolean;
  avatar_color: string;
}
