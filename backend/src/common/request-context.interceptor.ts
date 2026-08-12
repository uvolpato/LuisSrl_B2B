import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';
import { reqCtx, RequestContext } from './request-context';

/** Popola l'AsyncLocalStorage con l'attore della richiesta + requestId univoco. */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { id: number; userType: 'admin' | 'customer' }; ip?: string; method?: string; originalUrl?: string }>();
    const store: RequestContext = {
      actorId: req.user?.id ?? null,
      actorType: req.user?.userType ?? null,
      ip: req.ip,
      requestId: randomUUID(),
      method: req.method,
      url: req.originalUrl,
    };
    return new Observable((subscriber) => {
      reqCtx.run(store, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
