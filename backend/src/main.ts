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
import { setupWebSocket } from './ws/ws.setup';

async function bootstrap() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET mancante: definirlo in .env');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  app.setGlobalPrefix('api');
  app.set('trust proxy', 1);

  app.use(helmet());
  const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000').split(',');
  app.enableCors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      for (const o of allowedOrigins) {
        if (origin.startsWith(o)) return callback(null, true);
      }
      // auto-permetti LAN 192.168.x.x / 10.x.x.x su porta 3000 (HTTP o HTTPS)
      if (/^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000$/.test(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  });
  app.use(cookieParser());

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
        maxAge: 8 * 60 * 60 * 1000,
      },
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) return next();
    if (req.path === '/api/auth/login') return next();
    if (!req.session?.userId) return next();
    if (
      req.session.csrfToken &&
      req.headers['x-csrf-token'] === req.session.csrfToken
    ) {
      return next();
    }
    return res.status(403).json({ statusCode: 403, message: 'security.csrf' });
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
  const port = process.env.PORT ?? 3001;
  console.log(`API in ascolto su http://0.0.0.0:${port}/api`);

  // WebSocket su stesso server HTTP
  const httpServer = app.getHttpServer();
  setupWebSocket(httpServer);
  console.log('WebSocket pronto su /ws');
}

void bootstrap();
