import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET mancante: definirlo in .env');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  app.setGlobalPrefix('api');
  // dietro reverse proxy (HTTPS in produzione): fidati del primo hop
  app.set('trust proxy', 1);

  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.use(cookieParser());

  // Sessioni server-side su Postgres (tabella "session" creata via migrazione)
  const PgStore = connectPgSimple(session);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  app.use(
    session({
      store: new PgStore({ pool, tableName: 'session' }),
      name: 'luis.sid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 ore lavorative
      },
    }),
  );

  // CSRF: per le richieste mutanti di utenti autenticati l'header
  // X-CSRF-Token deve combaciare col token salvato in sessione al login.
  // Il login stesso e' escluso (protetto da SameSite=Lax + rate limiting).
  app.use((req: Request, res: Response, next: NextFunction) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) return next();
    if (req.path === '/api/auth/login') return next();
    if (!req.session?.userId) return next(); // senza sessione ci pensa il guard (401)
    if (
      req.session.csrfToken &&
      req.headers['x-csrf-token'] === req.session.csrfToken
    ) {
      return next();
    }
    return res.status(403).json({ statusCode: 403, message: 'security.csrf' });
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(Number(process.env.PORT ?? 3001));
  console.log(
    `API in ascolto su http://localhost:${process.env.PORT ?? 3001}/api`,
  );
}

void bootstrap();
