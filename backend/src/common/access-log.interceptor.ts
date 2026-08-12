import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { reqCtx } from '../common/request-context';

const ACTION_MAP: Array<{ pattern: RegExp; method: string; label: string }> = [
  { pattern: /^\/auth\/login$/, method: 'POST', label: 'Login' },
  { pattern: /^\/auth\/logout$/, method: 'POST', label: 'Logout' },
  { pattern: /^\/auth\/me$/, method: 'GET', label: 'Sessione' },
  { pattern: /^\/auth\/change-password$/, method: 'POST', label: 'Cambio password' },
  { pattern: /^\/carrello$/, method: 'GET', label: 'Visualizza carrello' },
  { pattern: /^\/carrello\/.*/, method: 'POST', label: 'Aggiungi al carrello' },
  { pattern: /^\/carrello\/.*/, method: 'DELETE', label: 'Rimuovi dal carrello' },
  { pattern: /^\/carrello\/.*/, method: 'PUT', label: 'Aggiorna carrello' },
  { pattern: /^\/catalogo\/.*/, method: 'GET', label: 'Scheda articolo' },
  { pattern: /^\/catalogo$/, method: 'GET', label: 'Catalogo' },
  { pattern: /^\/ordini$/, method: 'GET', label: 'Ordini cliente' },
  { pattern: /^\/checkout\/conferma$/, method: 'POST', label: 'Conferma ordine' },
  { pattern: /^\/checkout\/dati$/, method: 'GET', label: 'Dati checkout' },
  { pattern: /^\/checkout\/spedizione$/, method: 'GET', label: 'Calcolo spedizione' },
  { pattern: /^\/checkout\/validate-coupon$/, method: 'POST', label: 'Valida coupon' },
  { pattern: /^\/admin\/articoli.*/, method: 'PUT', label: 'Modifica articolo' },
  { pattern: /^\/admin\/articoli.*/, method: 'DELETE', label: 'Elimina articolo' },
  { pattern: /^\/admin\/clienti.*/, method: 'PUT', label: 'Modifica cliente' },
  { pattern: /^\/admin\/clienti.*/, method: 'DELETE', label: 'Elimina cliente' },
  { pattern: /^\/admin\/coupon.*/, method: 'POST', label: 'Crea coupon' },
  { pattern: /^\/admin\/coupon.*/, method: 'PUT', label: 'Modifica coupon' },
  { pattern: /^\/admin\/coupon.*/, method: 'DELETE', label: 'Elimina coupon' },
  { pattern: /^\/admin\/tariffe-spedizione.*/, method: 'POST', label: 'Nuova tariffa' },
  { pattern: /^\/admin\/tariffe-spedizione.*/, method: 'PUT', label: 'Modifica tariffa' },
  { pattern: /^\/admin\/ordini.*/, method: 'GET', label: 'Dashboard ordini' },
  { pattern: /^\/integrazione\/sync$/, method: 'POST', label: 'Avvio sync' },
  { pattern: /^\/integrazione\/importa$/, method: 'POST', label: 'Importa articoli' },
  { pattern: /^\/admin\/anomalie.*/, method: 'GET', label: 'Visualizza log' },
  { pattern: /^\/admin\/.*/, method: 'POST', label: 'Admin — creazione' },
  { pattern: /^\/admin\/.*/, method: 'PUT', label: 'Admin — modifica' },
  { pattern: /^\/admin\/.*/, method: 'PATCH', label: 'Admin — aggiorna' },
  { pattern: /^\/admin\/.*/, method: 'DELETE', label: 'Admin — elimina' },
  { pattern: /^\/admin\/.*/, method: 'GET', label: 'Admin — visualizza' },
  { pattern: /^\/.*/, method: 'GET', label: 'Richiesta pagina' },
  { pattern: /^\/.*/, method: 'POST', label: 'Invio dati' },
  { pattern: /^\/.*/, method: 'PUT', label: 'Aggiornamento' },
  { pattern: /^\/.*/, method: 'DELETE', label: 'Eliminazione' },
];

function getActionLabel(method: string, url: string): string {
  for (const entry of ACTION_MAP) {
    if (method === entry.method && entry.pattern.test(url)) {
      return entry.label;
    }
  }
  return `${method} ${url}`;
}

@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const store = reqCtx.getStore();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.write(req, 200, duration);
        },
        error: (err) => {
          const duration = Date.now() - start;
          const status = err?.status ?? err?.statusCode ?? 500;
          this.write(req, status, duration);
        },
      }),
    );
  }

  private async write(req: any, status: number, duration: number) {
    const store = reqCtx.getStore();
    const url = req.originalUrl || req.url || '';
    const label = getActionLabel(req.method, url);
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO anomalia_log (tipo, gravita, messaggio, dettaglio, contesto, created_at)
         VALUES ($1, 'info', $2, $3::jsonb, $4, now())`,
        'access',
        `${label} → ${status} (${duration}ms)`,
        JSON.stringify({
          method: req.method,
          url,
          status,
          duration,
          ip: req.ip,
          requestId: store?.requestId,
          userId: store?.actorId,
          userType: store?.actorType,
        }),
        store?.actorId ? `user:${store.actorId}` : null,
      );
    } catch { /* non bloccare */ }
  }
}
