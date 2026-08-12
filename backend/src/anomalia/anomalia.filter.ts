import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { AnomaliaService } from './anomalia.service';
import { EventLogService } from '../event-log/event-log.service';
import { reqCtx } from '../common/request-context';

@Catch()
export class AnomaliaFilter implements ExceptionFilter {
  constructor(
    private readonly anomalia: AnomaliaService,
    private readonly eventLog: EventLogService,
  ) {}

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
      this.anomalia.log('api', msg, gravita, contesto, {
        url: req.url, method: req.method, status, requestId: store?.requestId,
      });
      this.eventLog.logError(`${req.method} ${req.url}`, msg, status, {
        url: req.url, method: req.method, requestId: store?.requestId,
      });
    }

    if (exception instanceof HttpException) {
      res.status(status).json(exception.getResponse());
    } else {
      res.status(500).json({ statusCode: 500, message: 'Internal server error' });
    }
  }
}
