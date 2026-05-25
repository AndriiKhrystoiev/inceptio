import type { Env } from './env';
import { handleHealth } from './routes/health';
import { handleSearch } from './routes/search';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/health' && req.method === 'GET') {
      return handleHealth(env);
    }

    if (url.pathname === '/electional/search' && req.method === 'POST') {
      return handleSearch(req, env);
    }

    return Response.json(
      { error: 'not_found', path: url.pathname, method: req.method },
      { status: 404 },
    );
  },
} satisfies ExportedHandler<Env>;
