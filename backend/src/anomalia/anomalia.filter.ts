import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { AnomaliaService } from './anomalia.service';

@Catch()
export class AnomaliaFilter implements ExceptionFilter {
  constructor(private readonly anomalia: AnomaliaService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const msg = exception instanceof Error ? exception.message : String(exception);

    if (status >= 500) {
      const contesto = req.user ? `user:${req.user.id}` : undefined;
      this.anomalia.log('api', msg, 'error', contesto, {
        url: req.url,
        method: req.method,
        status,
      });
    }

    if (exception instanceof HttpException) {
      res.status(status).json(exception.getResponse());
    } else {
      res.status(500).json({ statusCode: 500, message: 'Internal server error' });
    }
  }
}
