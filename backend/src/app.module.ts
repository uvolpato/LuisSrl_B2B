import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { IntegrazioneModule } from './integrazione/integrazione.module';
import { CarrelloModule } from './carrello/carrello.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdiniModule } from './ordini/ordini.module';
import { ImgModule } from './img/img.module';
import { HealthController } from './health/health.controller';
import { RequestContextInterceptor } from './common/request-context.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // limite generale anti-abuso; il login ha il suo limite piu' severo
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    AdminModule,
    MailModule,
    IntegrazioneModule,
    CarrelloModule,
    CheckoutModule,
    OrdiniModule,
    ImgModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
})
export class AppModule {}
