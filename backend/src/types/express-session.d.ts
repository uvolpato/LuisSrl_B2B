import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userType?: 'admin' | 'customer';
    email?: string;
    nome?: string;
    csrfToken?: string;
  }
}
