import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { reqCtx } from './request-context';

/** Popola l'AsyncLocalStorage con l'attore della richiesta. Gira DOPO i guard,
 *  quindi req.user (settato da AuthenticatedGuard) e' gia' disponibile. */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { id: number; userType: 'admin' | 'customer' }; ip?: string }>();
    const store = {
      actorId: req.user?.id ?? null,
      actorType: req.user?.userType ?? null,
      ip: req.ip,
    };
    return new Observable((subscriber) => {
      reqCtx.run(store, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
