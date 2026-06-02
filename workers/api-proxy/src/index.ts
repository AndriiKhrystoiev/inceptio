import type { Env } from './env';
import { handleHealth } from './routes/health';
import { handleSearch } from './routes/search';
import { handleDailyNote } from './routes/daily-note';
import { handleAlertAck } from './routes/alert-ack';

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/health' && req.method === 'GET') {
      return handleHealth(env);
    }

    if (url.pathname === '/electional/search' && req.method === 'POST') {
      return handleSearch(req, env);
    }

    if (url.pathname === '/daily-note' && req.method === 'GET') {
      // ctx threaded so the route can use ctx.waitUntil for best-effort
      // KV counter writes (Task 2.6) without blocking the response.
      return handleDailyNote(req, env, ctx);
    }

    if (url.pathname === '/daily-note/alert-ack' && req.method === 'POST') {
      return handleAlertAck(req, env);
    }

    return Response.json(
      { error: 'not_found', path: url.pathname, method: req.method },
      { status: 404 },
    );
  },
} satisfies ExportedHandler<Env>;
