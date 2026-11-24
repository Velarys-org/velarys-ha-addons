import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { TicketKind } from '@velarys/hub-api';
import { log } from './log.js';
import type { TicketError, TicketResult, TicketService } from './tickets.js';

/**
 * Panneau « Velarys » de la barre latérale de Home Assistant (ingress de l'add-on, contrat 0.4.0).
 *
 * Aucun port n'est publié sur l'hôte : le Supervisor relaie l'ingress par son réseau interne, depuis
 * une seule adresse. Toute autre source (un autre add-on du même réseau) est refusée. L'accès au
 * panneau lui-même est contrôlé par Home Assistant (session de l'utilisateur, administrateurs seuls).
 */
export const PANEL_PORT = 8099;
/** Adresse du proxy d'ingress du Supervisor, la seule autorisée (documentation des add-ons). */
export const INGRESS_PEERS = ['172.30.32.2', '::ffff:172.30.32.2'];
/** En-tête exigé sur les écritures : un formulaire d'un autre site ne peut pas le poser sans preflight. */
export const PANEL_CSRF_HEADER = 'x-velarys-panel';

const STATIC_DIR = fileURLToPath(new URL('../panel/', import.meta.url));
const STATIC: Record<string, { file: string; type: string }> = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/panel.css': { file: 'panel.css', type: 'text/css; charset=utf-8' },
  '/panel.js': { file: 'panel.js', type: 'text/javascript; charset=utf-8' },
  '/favicon.svg': { file: 'favicon.svg', type: 'image/svg+xml' },
  '/favicon.png': { file: 'favicon.png', type: 'image/png' },
};

const SECURITY_HEADERS = {
  'content-security-policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

const STATUS_FOR: Record<TicketError, number> = {
  not_enrolled: 409,
  revoked: 409,
  empty: 400,
  message_too_long: 400,
  tickets_disabled: 503,
  rate_limited: 429,
  unknown_ticket: 404,
  ticket_closed: 409,
  unreachable: 502,
  rejected: 502,
};

const MAX_BODY = 32 * 1024;

export interface PanelOptions {
  tickets: TicketService;
  agentVersion: string;
  port?: number;
  /** Sources acceptées ; `PANEL_ALLOWED_PEERS` les remplace pour un essai hors Home Assistant. */
  allowedPeers?: readonly string[];
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

function sendResult<T>(res: ServerResponse, result: TicketResult<T>, okStatus = 200) {
  if (result.ok) return send(res, okStatus, result.value);
  return send(res, STATUS_FOR[result.error], { error: result.error });
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw Object.assign(new Error('corps trop volumineux'), { status: 413 });
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('JSON invalide'), { status: 400 });
  }
}

export function isTicketKind(value: unknown): value is TicketKind {
  return value === 'assistance' || value === 'evolution';
}

export function createPanelServer(options: PanelOptions): Server {
  const allowed = new Set(options.allowedPeers ?? INGRESS_PEERS);

  return createServer(async (req, res) => {
    try {
      if (!allowed.has(req.socket.remoteAddress ?? '')) {
        log.warning('Panneau : connexion refusée hors du proxy d’ingress', { peer: req.socket.remoteAddress ?? null });
        res.writeHead(403).end();
        return;
      }
      const path = (req.url ?? '/').split('?')[0]!;

      if (req.method === 'GET' && STATIC[path]) {
        const { file, type } = STATIC[path];
        const body = await readFile(`${STATIC_DIR}${file}`);
        res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': type, 'cache-control': 'no-cache' });
        res.end(body);
        return;
      }

      if (path === '/api/tickets' && req.method === 'GET') {
        return sendResult(res, await options.tickets.list());
      }

      if (path === '/api/tickets' && req.method === 'POST') {
        if (req.headers[PANEL_CSRF_HEADER] !== '1' || !req.headers['content-type']?.startsWith('application/json')) {
          return send(res, 403, { error: 'forbidden' });
        }
        const body = (await readBody(req)) as { kind?: unknown; message?: unknown } | null;
        if (!body || !isTicketKind(body.kind) || typeof body.message !== 'string') return send(res, 400, { error: 'invalid' });
        return sendResult(res, await options.tickets.create(body.kind, body.message), 201);
      }

      const thread = /^\/api\/tickets\/([0-9a-f-]{36})\/messages$/i.exec(path);
      if (thread && req.method === 'POST') {
        if (req.headers[PANEL_CSRF_HEADER] !== '1' || !req.headers['content-type']?.startsWith('application/json')) {
          return send(res, 403, { error: 'forbidden' });
        }
        const body = (await readBody(req)) as { message?: unknown } | null;
        if (!body || typeof body.message !== 'string') return send(res, 400, { error: 'invalid' });
        return sendResult(res, await options.tickets.addMessage(thread[1]!, body.message), 201);
      }

      if (path === '/api/version' && req.method === 'GET') return send(res, 200, { version: options.agentVersion });

      send(res, 404, { error: 'not_found' });
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      if (status === 500) log.error('Panneau : erreur interne', { detail: (error as Error).message });
      if (!res.headersSent) send(res, status, { error: status === 500 ? 'internal' : 'invalid' });
      else res.end();
    }
  });
}

export async function startPanel(options: PanelOptions): Promise<Server> {
  const server = createPanelServer(options);
  const port = options.port ?? PANEL_PORT;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve());
  });
  log.info('Panneau Velarys prêt (ingress)', { port });
  return server;
}
