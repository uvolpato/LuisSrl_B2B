import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { parse as parseCookie } from 'cookie';
import { Pool } from 'pg';
// cookie-signature (dipendenza di express-session) non ha tipi propri.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const signature = require('cookie-signature') as {
  unsign(input: string, secret: string): string | false;
};

const online = new Map<number, Set<string>>();

export function setupWebSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: '/ws',
    cors: {
      origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
      credentials: true,
    },
  });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookie(socket.handshake.headers.cookie ?? '');
      const raw = cookies['luis.sid'];
      if (!raw) return next(new Error('auth.no_session'));

      // Il cookie e' firmato da express-session ("s:<id>.<firma>"): va
      // defirmato per ricavare l'id reale della sessione (la chiave nella
      // tabella session e' l'id NON firmato).
      const sid = raw.startsWith('s:')
        ? signature.unsign(raw.slice(2), process.env.SESSION_SECRET as string)
        : raw;
      if (!sid) return next(new Error('auth.invalid_signature'));

      const res = await pool.query(
        `SELECT sess FROM session WHERE sid = $1 AND expire > now()`,
        [sid],
      );
      if (res.rows.length === 0) return next(new Error('auth.session_expired'));

      const sess = res.rows[0].sess;
      if (!sess?.userId) return next(new Error('auth.not_authenticated'));

      // La presenza e' una feature ADMIN (mostrata nel pannello admin). Solo gli
      // admin partecipano: cosi' la mappa contiene solo id di users (univoci) e
      // non collide con i customers, che hanno sequenze di id indipendenti.
      if (sess.userType !== 'admin') return next(new Error('auth.forbidden'));

      socket.data.userId = sess.userId;
      socket.data.userType = sess.userType;
      next();
    } catch {
      next(new Error('auth.error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId: number = socket.data.userId;
    if (!userId) return;

    if (!online.has(userId)) online.set(userId, new Set());
    online.get(userId)!.add(socket.id);

    if (online.get(userId)!.size === 1) {
      // Solo l'id: niente email/nome in broadcast (il pannello admin ha gia' i
      // dati via API). Evita di diffondere informazioni sugli account.
      io.emit('user.online', { userId });
    }
    socket.emit('presence', { onlineIds: [...online.keys()] });

    socket.on('disconnect', () => {
      const sockets = online.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          online.delete(userId);
          io.emit('user.offline', { userId });
        }
      }
    });

    socket.on('ping', () => {
      socket.emit('pong', {});
    });
  });

  return io;
}
