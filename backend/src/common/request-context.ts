import { AsyncLocalStorage } from 'node:async_hooks';

/** Chi sta facendo la richiesta corrente, per l'audit automatico in Prisma. */
export interface ReqStore {
  actorId: number | null;
  actorType: 'admin' | 'customer' | null;
  ip?: string;
}

// ponytail: AsyncLocalStorage (stdlib) — porta l'attore fino all'extension
// Prisma senza passarlo a ogni chiamata dei service.
export const reqCtx = new AsyncLocalStorage<ReqStore>();
