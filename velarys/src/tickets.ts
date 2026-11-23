import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import Value from 'typebox/value';
import {
  HUB_PATHS,
  PINNED_SEAL_KEYS,
  privateKeyFromPem,
  SealKeyResponse,
  sealKeyId,
  sealText,
  TICKET_MESSAGE_MAX_CHARS,
  TICKET_SCHEMA_V1,
  TicketCreateResponse,
  TicketListResponse,
  type SealPublicKey,
  type TicketCreateRequest,
  type TicketKind,
  type TicketSummary,
} from '@velarys/hub-api';
import { signedPost } from './central.js';
import type { HubIdentity } from './identity.js';
import { log } from './log.js';
import { TICKETS_FILE } from './paths.js';

/**
 * Copie locale des demandes envoyées depuis ce hub : le texte que le client a écrit, pour qu'il le
 * relise dans le panneau. Le central ne le renvoie jamais (rien de libre ne redescend), il ne donne
 * que des statuts. Ce fichier suit les sauvegardes de HA : c'est le texte du client, chez lui.
 */
export interface LocalTicket {
  id: string;
  kind: TicketKind;
  text: string;
  createdAt: string;
}

/** Ce que le panneau affiche : la copie locale croisée avec le statut du central. */
export interface PanelTicket extends TicketSummary {
  /** `null` = demande connue du central mais absente de ce hub (add-on réinstallé). */
  text: string | null;
}

export type TicketError =
  | 'not_enrolled'
  | 'revoked'
  | 'empty'
  | 'message_too_long'
  | 'tickets_disabled'
  | 'rate_limited'
  | 'unreachable'
  | 'rejected';

export type TicketResult<T> = { ok: true; value: T } | { ok: false; error: TicketError; detail?: string };

const KEEP_LOCAL = 50;

/** Nombre de caractères tel que le client le voit (points de code), comme le compte le central. */
export const messageLength = (text: string) => [...text].length;

export interface TicketDeps {
  centralUrl: string;
  loadIdentity(): Promise<HubIdentity | null>;
  fetchImpl?: typeof fetch;
  post?: typeof signedPost;
  file?: string;
}

/**
 * Clé de scellement du central visé. Pour le central de production, la clé **épinglée** dans le
 * contrat et jamais celle que servirait le réseau : Cloudflare termine le TLS du tunnel et pourrait la
 * remplacer, ce qui annulerait le chiffrement. Pour un autre central (test, développement), la clé
 * est lue sur le central lui-même.
 */
export async function resolveSealKey(centralUrl: string, fetchImpl: typeof fetch = fetch): Promise<TicketResult<SealPublicKey>> {
  const pinned = PINNED_SEAL_KEYS[centralUrl];
  if (pinned) {
    const key = pinned[0];
    return key ? { ok: true, value: key } : { ok: false, error: 'tickets_disabled', detail: 'aucune clé épinglée pour ce central' };
  }
  let res: Response;
  try {
    res = await fetchImpl(`${centralUrl}${HUB_PATHS.sealKey}`, { signal: AbortSignal.timeout(20_000) });
  } catch (error) {
    return { ok: false, error: 'unreachable', detail: (error as Error).message };
  }
  const body = (await res.json().catch(() => null)) as unknown;
  if (res.status === 403 && (body as { error?: string } | null)?.error === 'tickets_disabled') {
    return { ok: false, error: 'tickets_disabled' };
  }
  if (!res.ok || !Value.Check(SealKeyResponse, body)) return { ok: false, error: 'unreachable', detail: `clé illisible (HTTP ${res.status})` };
  if (sealKeyId(body.publicKey) !== body.kid) return { ok: false, error: 'rejected', detail: 'identifiant de clé incohérent' };
  log.warning('Clé de scellement lue sur le central (non épinglée) : à réserver aux centraux de test', { central: centralUrl, kid: body.kid });
  return { ok: true, value: { kid: body.kid, publicKey: body.publicKey } };
}

export class TicketService {
  private readonly file: string;
  private readonly post: typeof signedPost;
  private readonly fetchImpl: typeof fetch;
  private sealKey: SealPublicKey | null = null;

  constructor(private readonly deps: TicketDeps) {
    this.file = deps.file ?? TICKETS_FILE;
    this.post = deps.post ?? signedPost;
    this.fetchImpl = deps.fetchImpl ?? fetch;
  }

  private async identity(): Promise<TicketResult<HubIdentity>> {
    const identity = await this.deps.loadIdentity();
    if (!identity) return { ok: false, error: 'not_enrolled' };
    if (identity.revokedAt) return { ok: false, error: 'revoked' };
    return { ok: true, value: identity };
  }

  async readLocal(): Promise<LocalTicket[]> {
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8')) as { tickets?: LocalTicket[] };
      return Array.isArray(data.tickets) ? data.tickets : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      log.warning('Copie locale des demandes illisible, ignorée', { detail: (error as Error).message });
      return [];
    }
  }

  private async writeLocal(tickets: LocalTicket[]): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await writeFile(tmp, `${JSON.stringify({ tickets: tickets.slice(0, KEEP_LOCAL) }, null, 2)}\n`, { mode: 0o600 });
    await rename(tmp, this.file);
  }

  async create(kind: TicketKind, rawText: string): Promise<TicketResult<PanelTicket>> {
    const text = rawText.replace(/\r\n?/g, '\n').trim();
    if (!text) return { ok: false, error: 'empty' };
    if (messageLength(text) > TICKET_MESSAGE_MAX_CHARS) return { ok: false, error: 'message_too_long' };
    const id = await this.identity();
    if (!id.ok) return id;

    if (!this.sealKey) {
      const key = await resolveSealKey(this.deps.centralUrl, this.fetchImpl);
      if (!key.ok) return key;
      this.sealKey = key.value;
    }
    const request: TicketCreateRequest = {
      schema: TICKET_SCHEMA_V1,
      kind,
      sealed: await sealText(this.sealKey, text, id.value.hubId, kind),
    };
    const result = await this.post<TicketCreateResponse>(this.deps.centralUrl, HUB_PATHS.tickets, request, {
      privateKey: privateKeyFromPem(id.value.privateKeyPem),
      keyId: id.value.hubId,
    });
    if (result.kind === 'unreachable') return { ok: false, error: 'unreachable', detail: result.detail };
    if (result.kind === 'rejected') {
      // Clé inconnue : le central a changé de clé ; on la relira au prochain envoi (hors production).
      if (result.error === 'unknown_seal_key') this.sealKey = null;
      const known: TicketError[] = ['tickets_disabled', 'rate_limited', 'message_too_long', 'revoked'];
      const error = known.includes(result.error as TicketError) ? (result.error as TicketError) : 'rejected';
      log.warning('Demande refusée par le central', { error: result.error, message: result.message });
      return { ok: false, error, detail: result.error };
    }
    if (!Value.Check(TicketCreateResponse, result.body)) return { ok: false, error: 'rejected', detail: 'réponse hors contrat' };
    const ticket = result.body.ticket;
    await this.writeLocal([{ id: ticket.id, kind, text, createdAt: ticket.createdAt }, ...(await this.readLocal())]);
    log.info('Demande envoyée au central', { ticketId: ticket.id, kind });
    return { ok: true, value: { ...ticket, text } };
  }

  /** Demandes du hub : statuts du central, textes de la copie locale. */
  async list(): Promise<TicketResult<PanelTicket[]>> {
    const id = await this.identity();
    if (!id.ok) return id;
    const local = await this.readLocal();
    const result = await this.post<TicketListResponse>(this.deps.centralUrl, HUB_PATHS.ticketList, {}, {
      privateKey: privateKeyFromPem(id.value.privateKeyPem),
      keyId: id.value.hubId,
    });
    if (result.kind === 'unreachable') return { ok: false, error: 'unreachable', detail: result.detail };
    if (result.kind === 'rejected') {
      const error = result.error === 'revoked' ? 'revoked' : 'rejected';
      return { ok: false, error, detail: result.error };
    }
    if (!Value.Check(TicketListResponse, result.body)) return { ok: false, error: 'rejected', detail: 'réponse hors contrat' };
    const texts = new Map(local.map((t) => [t.id, t.text]));
    return { ok: true, value: result.body.tickets.map((t) => ({ ...t, text: texts.get(t.id) ?? null })) };
  }
}
