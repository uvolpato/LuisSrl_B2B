import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import { Pool } from 'pg';

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
      const cookies = cookie.parse(socket.handshake.headers.cookie ?? '');
      const sid = cookies['luis.sid'];
      if (!sid) return next(new Error('auth.no_session'));

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
