import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: number;
    userType: string;
    email: string;
    nome: string;
    csrfToken: string;
    sessionToken: string;
    /** Login a metà: password ok, in attesa del codice MFA. */
    pendingUserId?: number;
    pendingUserType?: string;
    pendingMfaDa?: number;
    pendingRemember?: boolean;
  }
}
