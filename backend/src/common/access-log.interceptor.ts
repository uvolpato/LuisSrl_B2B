import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit/audit.service';

const ACTION_MAP: Array<{ pattern: RegExp; method: string; label: string }> = [
  { pattern: /^\/auth\/login$/, method: 'POST', label: 'Login' },
  { pattern: /^\/auth\/logout$/, method: 'POST', label: 'Logout' },
  { pattern: /^\/auth\/me$/, method: 'GET', label: 'Verifica sessione' },
  { pattern: /^\/carrello\/.*/, method: 'POST', label: 'Aggiungi carrello' },
  { pattern: /^\/carrello\/.*/, method: 'DELETE', label: 'Rimuovi carrello' },
  { pattern: /^\/checkout\/conferma$/, method: 'POST', label: 'Conferma ordine' },
  { pattern: /^\/checkout\/validate-coupon$/, method: 'POST', label: 'Valida coupon' },
  { pattern: /^\/admin\/.*/, method: 'POST', label: 'Admin — crea' },
  { pattern: /^\/admin\/.*/, method: 'PUT', label: 'Admin — modifica' },
  { pattern: /^\/admin\/.*/, method: 'PATCH', label: 'Admin — aggiorna' },
  { pattern: /^\/admin\/.*/, method: 'DELETE', label: 'Admin — elimina' },
  { pattern: /^\/admin\/.*/, method: 'GET', label: 'Admin — visualizza' },
  { pattern: /^\/integrazione\/sync$/, method: 'POST', label: 'Sync avviato' },
  { pattern: /^\/integrazione\/importa$/, method: 'POST', label: 'Importa articoli' },
  { pattern: /^\/.*/, method: 'GET', label: 'Pagina' },
  { pattern: /^\/.*/, method: 'POST', label: 'Invio dati' },
  { pattern: /^\/.*/, method: 'PUT', label: 'Aggiornamento' },
  { pattern: /^\/.*/, method: 'DELETE', label: 'Eliminazione' },
];

function getLabel(method: string, url: string): string {
  const path = url.replace(/^\/api/, '');
  for (const e of ACTION_MAP) if (method === e.method && e.pattern.test(path)) return e.label;
  return `${method} ${url}`;
}

@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  constructor(private readonly log: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(tap({
      next: () => this.log.logAccess(req.method, req.originalUrl || req.url, 200, Date.now() - start, getLabel(req.method, req.originalUrl || req.url)),
      error: (err: any) => this.log.logAccess(req.method, req.originalUrl || req.url, err?.status ?? 500, Date.now() - start, getLabel(req.method, req.originalUrl || req.url)),
    }));
  }
}
