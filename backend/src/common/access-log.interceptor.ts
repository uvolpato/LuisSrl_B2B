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
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO anomalia_log (tipo, gravita, messaggio, dettaglio, contesto, created_at)
         VALUES ($1, 'info', $2, $3::jsonb, $4, now())`,
        'access',
        `${req.method} ${req.originalUrl || req.url} → ${status} (${duration}ms)`,
        JSON.stringify({
          method: req.method,
          url: req.originalUrl || req.url,
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
