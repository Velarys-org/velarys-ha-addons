import type { KeyObject } from 'node:crypto';
import { signRequest, type HubErrorCode } from '@velarys/hub-api';

const TIMEOUT_MS = 20_000;

export type CentralResult<T> =
  | { kind: 'ok'; status: number; body: T }
  /** Refus explicite du central : `error` décide de la suite. */
  | { kind: 'rejected'; status: number; error: HubErrorCode | string; message: string }
  /** Réseau, tunnel, 5xx : on réessaie plus tard. */
  | { kind: 'unreachable'; detail: string };

/** POST JSON signé (RFC 9421) vers le central. */
export async function signedPost<T>(
  centralUrl: string,
  path: string,
  payload: unknown,
  key: { privateKey: KeyObject; keyId: string },
): Promise<CentralResult<T>> {
  const url = `${centralUrl}${path}`;
  const body = JSON.stringify(payload);
  let res: Response;
  try {
    const headers = await signRequest({ method: 'POST', url, body }, key);
    res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    return { kind: 'unreachable', detail: (error as Error).message };
  }
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.ok && json) return { kind: 'ok', status: res.status, body: json as T };
  if (res.status >= 400 && res.status < 500 && json && typeof json['error'] === 'string') {
    return { kind: 'rejected', status: res.status, error: json['error'], message: String(json['message'] ?? '') };
  }
  return { kind: 'unreachable', detail: `HTTP ${res.status}` };
}
