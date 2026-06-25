import { Prisma } from '@prisma/client';
import { reqCtx } from './request-context';

// ponytail: audita ogni scrittura sui modelli del catalogo. Aggiungere/togliere
// un modello = una riga nel Set. AuditLog escluso, altrimenti l'INSERT di audit
// rientrerebbe nell'extension all'infinito.
const AUDITED = new Set([
  'Famiglia',
  'Articolo',
  'Variante',
  'Immagine',
  'Raccolta',
  'ArticoloRaccolta',
]);
const WRITES = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

export const auditExtension = Prisma.defineExtension((client) =>
  client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const res = await query(args);
          if (AUDITED.has(model) && WRITES.has(operation)) {
            const s = reqCtx.getStore();
            const where = (args as { where?: Record<string, unknown> })?.where;
            const r = res as Record<string, unknown> | null;
            const id =
              r?.id ??
              r?.codice ??
              r?.codiceLinea ??
              where?.id ??
              where?.codice ??
              where?.codiceLinea ??
              '';
            // fire-and-forget: un audit fallito non deve far fallire la scrittura
            void client.auditLog
              .create({
                data: {
                  actorId: s?.actorId ?? null,
                  actorType: s?.actorType ?? null,
                  azione: `${model}.${operation}`.toLowerCase(),
                  entita: model,
                  entitaId: String(id),
                  ip: s?.ip ?? null,
                },
              })
              .catch(() => {});
          }
          return res;
        },
      },
    },
  }),
);
