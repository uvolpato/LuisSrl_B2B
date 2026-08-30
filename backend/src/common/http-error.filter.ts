import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { reqCtx } from '../common/request-context';

/** Filtro globale: logga ogni errore HTTP su audit_log e restituisce la risposta. */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  constructor(private readonly audit: AuditService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const msg = exception instanceof Error ? exception.message : String(exception);
    const store = reqCtx.getStore();

    if (status >= 400) {
      const contesto = req.user ? `user:${req.user.id}` : undefined;
      const gravita = status >= 500 ? 'error' : status === 429 ? 'warning' : 'info';
      this.audit.logError(`${req.method} ${req.url}`, msg, status, {
        url: req.url, method: req.method, gravita, contesto, requestId: store?.requestId,
      });
    }

    if (exception instanceof HttpException) {
      res.status(status).json(exception.getResponse());
    } else {
      res.status(500).json({ statusCode: 500, message: 'Internal server error' });
    }
  }
}
