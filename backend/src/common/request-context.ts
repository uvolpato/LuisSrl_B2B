import { AsyncLocalStorage } from 'node:async_hooks';

/** Chi sta facendo la richiesta corrente, per l'audit automatico in Prisma. */
export interface RequestContext {
  actorId: number | null;
  actorType: 'admin' | 'customer' | null;
  ip?: string;
  requestId: string;
  method?: string;
  url?: string;
}

export const reqCtx = new AsyncLocalStorage<RequestContext>();
