import { JsonStdio } from './jsonRpc';
import { randomUUID } from 'node:crypto';
import logger from './services/logger';
import { testConnection } from './connectors/postgres';
import { SessionManager } from './sessionManager';

const rpc = new JsonStdio();
const sessions = new SessionManager();

logger.info('Bridge (JSON-RPC) starting');


// send initial ready notification
rpc.sendNotification('bridge.ready', { pid: process.pid });

// handle incoming notifications (one-way)
rpc.on('notification', (n: any) => {
  logger.debug({ notification: n }, 'received notification (one-way)');
  // example: allow UI to send log forwarders etc.
});

// handle incoming requests (id present)
rpc.on('request', async (req: any) => {
  const id = req.id;
  const method = req.method;
  const params = req.params;
  logger.info({ id, method }, 'incoming request');

  try {
    switch (method) {
      case 'ping': {
        // simple echo ping: respond with same params or a pong
        rpc.sendResponse(id, { ok: true, data: { msg: 'pong', echo: params } });
        break;
      }

      case 'health.ping': {
        rpc.sendResponse(id, { ok: true, data: { uptimeSec: process.uptime(), pid: process.pid } });
        break;
      }

      case 'connection.test': {
        const cfg = params?.config;
        const res = await testConnection(cfg);
        rpc.sendResponse(id, { ok: res.ok, message: res.message });
        break;
      }

     case 'query.createSession': {
  const sessionId = randomUUID();
  sessions.create(sessionId, {});
  rpc.sendResponse(id, { ok: true, data: { sessionId } });
  break;
}


      default: {
        rpc.sendError(id, { code: 'UNKNOWN_METHOD', message: `Unknown method ${method}` });
      }
    }
  } catch (err: any) {
    logger.error({ err }, 'error handling request');
    rpc.sendError(id, { code: 'INTERNAL_ERROR', message: String(err) });
  }
});

// graceful shutdown logging
process.on('SIGINT', () => {
  logger.info('Bridge received SIGINT — exiting');
  process.exit(0);
});
process.on('SIGTERM', () => {
  logger.info('Bridge received SIGTERM — exiting');
  process.exit(0);
});
