/**
 * Client minimal de l'API WebSocket de Home Assistant, par le proxy du Supervisor
 * (`ws://supervisor/core/websocket`, jeton SUPERVISOR_TOKEN, permis par `homeassistant_api: true`).
 * Une connexion par relevé de santé, refermée ensuite : rien ne reste ouvert entre deux relevés.
 */
const TIMEOUT_MS = 10_000;

export interface HaWs {
  /** Envoie une commande (`{ type, ... }`) et renvoie son `result`, ou lève si HA la refuse. */
  command<T>(message: Record<string, unknown>): Promise<T>;
  close(): void;
}

export function haWsUrl(): string {
  return process.env['HA_WS_URL'] ?? 'ws://supervisor/core/websocket';
}

export async function openHaWs(token: string, url = haWsUrl(), timeoutMs = TIMEOUT_MS): Promise<HaWs> {
  const ws = new WebSocket(url);
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
  let nextId = 1;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket de HA : pas d’authentification dans le délai'));
    }, timeoutMs);
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('WebSocket de HA injoignable'));
    });
    ws.addEventListener('message', function onAuth(event) {
      const msg = JSON.parse(String(event.data)) as { type?: string };
      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: token }));
      } else if (msg.type === 'auth_ok') {
        clearTimeout(timer);
        ws.removeEventListener('message', onAuth);
        resolve();
      } else if (msg.type === 'auth_invalid') {
        clearTimeout(timer);
        ws.close();
        reject(new Error('WebSocket de HA : jeton refusé'));
      }
    });
  });

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data)) as {
      id?: number;
      type?: string;
      success?: boolean;
      result?: unknown;
      error?: { code?: string; message?: string };
    };
    if (msg.type !== 'result' || msg.id === undefined) return;
    const waiter = pending.get(msg.id);
    if (!waiter) return;
    pending.delete(msg.id);
    clearTimeout(waiter.timer);
    if (msg.success) waiter.resolve(msg.result);
    else waiter.reject(new Error(`${msg.error?.code ?? 'error'}: ${msg.error?.message ?? 'refusé par HA'}`));
  });
  ws.addEventListener('close', () => {
    for (const [, waiter] of pending) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('WebSocket de HA fermée'));
    }
    pending.clear();
  });

  return {
    command<T>(message: Record<string, unknown>): Promise<T> {
      const id = nextId++;
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`WebSocket de HA : pas de réponse à ${String(message['type'])}`));
        }, timeoutMs);
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
        ws.send(JSON.stringify({ ...message, id }));
      });
    },
    close() {
      ws.close();
    },
  };
}
