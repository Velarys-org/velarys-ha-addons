import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import Value from 'typebox/value';
import {
  generateSealKeyPair,
  HUB_PATHS,
  openSealedText,
  PINNED_REPLY_KEYS,
  PINNED_SEAL_KEYS,
  privateKeyFromPem,
  ReplyKeysResponse,
  SealKeyResponse,
  sealKeyId,
  sealText,
  TICKET_MESSAGE_MAX_CHARS,
  TICKET_MESSAGE_SCHEMA_V1,
  TICKET_SCHEMA_V1,
  TicketCreateResponse,
  TicketListResponse,
  TicketMessageCreateResponse,
  verifySignedReply,
  type ReplyKey,
  type ReplyTemplate,
  type SealPublicKey,
  type SignedReply,
  type TicketCreateRequest,
  type TicketKind,
  type TicketMessage,
  type TicketSummary,
} from '@velarys/hub-api';
import { signedPost } from './central.js';
import type { HubIdentity } from './identity.js';
import { log } from './log.js';
import { TICKETS_FILE } from './paths.js';

/**
 * Copie locale de ce que le client a écrit depuis ce hub (premiers messages et ajouts au fil), pour
 * qu'il le relise dans le panneau : le central ne renvoie jamais le texte du client. Ce fichier suit
 * les sauvegardes de HA : c'est le texte du client, chez lui.
 */
export interface LocalTicket {
  id: string;
  kind: TicketKind;
  text: string;
  createdAt: string;
}
export interface LocalMessage {
  id: string;
  ticketId: string;
  text: string;
  createdAt: string;
}
interface LocalStore {
  tickets: LocalTicket[];
  messages: LocalMessage[];
}

/** Un message du fil tel que le panneau l'affiche. */
export interface PanelMessage {
  id: string;
  author: 'client' | 'velarys';
  createdAt: string;
  /** Texte libre : celui du client (copie locale), ou une réponse de Velarys dont la signature est valide. */
  text: string | null;
  /** Message type de Velarys : le panneau affiche son propre texte. */
  template: ReplyTemplate | null;
  /**
   * `ok` ; `missing` : message du client absent de ce hub (add-on réinstallé) ; `unverified` : réponse
   * de Velarys dont la signature ne correspond à aucune passkey épinglée, jamais affichée.
   */
  state: 'ok' | 'missing' | 'unverified';
  /** Réponse libre dont la signature par passkey a été vérifiée sur ce hub. */
  signed: boolean;
}

/** Ce que le panneau affiche : la demande, son premier message et son fil. */
export interface PanelTicket extends Omit<TicketSummary, 'messages'> {
  /** `null` = demande connue du central mais absente de ce hub (add-on réinstallé). */
  text: string | null;
  thread: PanelMessage[];
}

export type TicketError =
  | 'not_enrolled'
  | 'revoked'
  | 'empty'
  | 'message_too_long'
  | 'tickets_disabled'
  | 'rate_limited'
  | 'unknown_ticket'
  | 'ticket_closed'
  | 'unreachable'
  | 'rejected';

export type TicketResult<T> = { ok: true; value: T } | { ok: false; error: TicketError; detail?: string };

const KEEP_LOCAL_TICKETS = 50;
const KEEP_LOCAL_MESSAGES = 500;
/** Durée de cache des passkeys lues sur un central de test. */
const REPLY_KEYS_TTL_MS = 10 * 60 * 1000;

/** Nombre de caractères tel que le client le voit (points de code), comme le compte le central. */
export const messageLength = (text: string) => [...text].length;
const normalize = (text: string) => text.replace(/\r\n?/g, '\n').trim();

export interface TicketDeps {
  centralUrl: string;
  loadIdentity(): Promise<HubIdentity | null>;
  saveIdentity?(identity: HubIdentity): Promise<void>;
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

/**
 * Passkeys qui signent les réponses de Velarys. Pour le central de production, celles **épinglées**
 * dans le contrat : un central compromis servirait les siennes. Ailleurs, lues sur le central.
 */
export async function resolveReplyKeys(centralUrl: string, fetchImpl: typeof fetch = fetch): Promise<readonly ReplyKey[]> {
  const pinned = PINNED_REPLY_KEYS[centralUrl];
  if (pinned) return pinned;
  try {
    const res = await fetchImpl(`${centralUrl}${HUB_PATHS.replyKeys}`, { signal: AbortSignal.timeout(20_000) });
    const body = (await res.json().catch(() => null)) as unknown;
    if (!res.ok || !Value.Check(ReplyKeysResponse, body)) return [];
    if (body.keys.length) log.warning('Passkeys de réponse lues sur le central (non épinglées) : à réserver aux centraux de test', { central: centralUrl });
    return body.keys;
  } catch {
    return [];
  }
}

export class TicketService {
  private readonly file: string;
  private readonly post: typeof signedPost;
  private readonly fetchImpl: typeof fetch;
  private sealKey: SealPublicKey | null = null;
  private replyKeys: { keys: readonly ReplyKey[]; at: number } | null = null;

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

  /** Clé de réponse du hub, créée et enregistrée au premier besoin. */
  private async replyKey(identity: HubIdentity): Promise<NonNullable<HubIdentity['replyKey']> | null> {
    if (identity.replyKey) return identity.replyKey;
    if (!this.deps.saveIdentity) return null;
    const pair = await generateSealKeyPair();
    const replyKey = { privateKey: pair.privateKey, publicKey: pair.publicKey };
    await this.deps.saveIdentity({ ...identity, replyKey });
    log.info('Clé de réponse du hub créée', { kid: replyKey.publicKey.kid });
    return replyKey;
  }

  private async keysForReplies(): Promise<readonly ReplyKey[]> {
    if (this.replyKeys && Date.now() - this.replyKeys.at < REPLY_KEYS_TTL_MS) return this.replyKeys.keys;
    const keys = await resolveReplyKeys(this.deps.centralUrl, this.fetchImpl);
    this.replyKeys = { keys, at: Date.now() };
    return keys;
  }

  async readLocal(): Promise<LocalStore> {
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8')) as Partial<LocalStore>;
      return {
        tickets: Array.isArray(data.tickets) ? data.tickets : [],
        messages: Array.isArray(data.messages) ? data.messages : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.warning('Copie locale des demandes illisible, ignorée', { detail: (error as Error).message });
      }
      return { tickets: [], messages: [] };
    }
  }

  private async writeLocal(store: LocalStore): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    const data = { tickets: store.tickets.slice(0, KEEP_LOCAL_TICKETS), messages: store.messages.slice(-KEEP_LOCAL_MESSAGES) };
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
    await rename(tmp, this.file);
  }

  private async ensureSealKey(): Promise<TicketResult<SealPublicKey>> {
    if (this.sealKey) return { ok: true, value: this.sealKey };
    const key = await resolveSealKey(this.deps.centralUrl, this.fetchImpl);
    if (key.ok) this.sealKey = key.value;
    return key;
  }

  private rejected(result: { error: string; message: string }, known: TicketError[]): { ok: false; error: TicketError; detail: string } {
    // Clé inconnue : le central a changé de clé ; on la relira au prochain envoi (hors production).
    if (result.error === 'unknown_seal_key') this.sealKey = null;
    log.warning('Refus du central', { error: result.error, message: result.message });
    const error = known.includes(result.error as TicketError) ? (result.error as TicketError) : 'rejected';
    return { ok: false, error, detail: result.error };
  }

  private checkText(text: string): TicketError | null {
    if (!text) return 'empty';
    if (messageLength(text) > TICKET_MESSAGE_MAX_CHARS) return 'message_too_long';
    return null;
  }

  async create(kind: TicketKind, rawText: string): Promise<TicketResult<PanelTicket>> {
    const text = normalize(rawText);
    const problem = this.checkText(text);
    if (problem) return { ok: false, error: problem };
    const id = await this.identity();
    if (!id.ok) return id;
    const key = await this.ensureSealKey();
    if (!key.ok) return key;

    const request: TicketCreateRequest = {
      schema: TICKET_SCHEMA_V1,
      kind,
      sealed: await sealText(key.value, text, id.value.hubId, kind),
    };
    const result = await this.post<TicketCreateResponse>(this.deps.centralUrl, HUB_PATHS.tickets, request, {
      privateKey: privateKeyFromPem(id.value.privateKeyPem),
      keyId: id.value.hubId,
    });
    if (result.kind === 'unreachable') return { ok: false, error: 'unreachable', detail: result.detail };
    if (result.kind === 'rejected') return this.rejected(result, ['tickets_disabled', 'rate_limited', 'message_too_long', 'revoked']);
    if (!Value.Check(TicketCreateResponse, result.body)) return { ok: false, error: 'rejected', detail: 'réponse hors contrat' };
    const ticket = result.body.ticket;
    const store = await this.readLocal();
    await this.writeLocal({ ...store, tickets: [{ id: ticket.id, kind, text, createdAt: ticket.createdAt }, ...store.tickets] });
    log.info('Demande envoyée au central', { ticketId: ticket.id, kind });
    return { ok: true, value: { ...ticket, text, thread: [] } };
  }

  /** Ajoute un message du client au fil d'une demande ouverte, scellé comme le premier. */
  async addMessage(ticketId: string, rawText: string): Promise<TicketResult<PanelMessage>> {
    const text = normalize(rawText);
    const problem = this.checkText(text);
    if (problem) return { ok: false, error: problem };
    const id = await this.identity();
    if (!id.ok) return id;
    const key = await this.ensureSealKey();
    if (!key.ok) return key;
    const result = await this.post<TicketMessageCreateResponse>(
      this.deps.centralUrl,
      HUB_PATHS.ticketMessages,
      { schema: TICKET_MESSAGE_SCHEMA_V1, ticketId, sealed: await sealText(key.value, text, id.value.hubId, `message:${ticketId}`) },
      { privateKey: privateKeyFromPem(id.value.privateKeyPem), keyId: id.value.hubId },
    );
    if (result.kind === 'unreachable') return { ok: false, error: 'unreachable', detail: result.detail };
    if (result.kind === 'rejected') {
      return this.rejected(result, ['tickets_disabled', 'rate_limited', 'message_too_long', 'revoked', 'unknown_ticket', 'ticket_closed']);
    }
    if (!Value.Check(TicketMessageCreateResponse, result.body)) return { ok: false, error: 'rejected', detail: 'réponse hors contrat' };
    const message = result.body.message;
    const store = await this.readLocal();
    await this.writeLocal({ ...store, messages: [...store.messages, { id: message.id, ticketId, text, createdAt: message.createdAt }] });
    return { ok: true, value: { ...message, text, template: null, state: 'ok', signed: false } };
  }

  /** Ouvre et vérifie une réponse libre de Velarys ; rien n'est affiché sans signature valide. */
  private async openReply(
    message: Extract<TicketMessage, { sealed: unknown }>,
    ticketId: string,
    identity: HubIdentity,
    replyKey: NonNullable<HubIdentity['replyKey']>,
  ): Promise<PanelMessage> {
    const base = { id: message.id, author: 'velarys' as const, createdAt: message.createdAt, template: null };
    let signed: SignedReply;
    try {
      signed = JSON.parse(
        await openSealedText(replyKey.privateKey, message.sealed, identity.hubId, `reply:${ticketId}:${message.id}`),
      ) as SignedReply;
    } catch {
      return { ...base, text: null, state: 'unverified', signed: false };
    }
    const verdict = verifySignedReply(signed, await this.keysForReplies(), { hubId: identity.hubId, ticketId, messageId: message.id });
    if (!verdict.ok) {
      log.warning('Réponse de Velarys non affichée : signature refusée', { ticketId, messageId: message.id, reason: verdict.reason });
      return { ...base, text: null, state: 'unverified', signed: false };
    }
    return { ...base, text: verdict.text, state: 'ok', signed: true };
  }

  /** Demandes du hub : statuts et fil du central, textes du client depuis la copie locale. */
  async list(): Promise<TicketResult<PanelTicket[]>> {
    const id = await this.identity();
    if (!id.ok) return id;
    const replyKey = await this.replyKey(id.value);
    const store = await this.readLocal();
    const result = await this.post<TicketListResponse>(
      this.deps.centralUrl,
      HUB_PATHS.ticketList,
      replyKey ? { replyKey: replyKey.publicKey } : {},
      { privateKey: privateKeyFromPem(id.value.privateKeyPem), keyId: id.value.hubId },
    );
    if (result.kind === 'unreachable') return { ok: false, error: 'unreachable', detail: result.detail };
    if (result.kind === 'rejected') return { ok: false, error: result.error === 'revoked' ? 'revoked' : 'rejected', detail: result.error };
    if (!Value.Check(TicketListResponse, result.body)) return { ok: false, error: 'rejected', detail: 'réponse hors contrat' };

    const firstTexts = new Map(store.tickets.map((t) => [t.id, t.text]));
    const ownTexts = new Map(store.messages.map((m) => [m.id, m.text]));
    const tickets: PanelTicket[] = [];
    for (const { messages = [], ...t } of result.body.tickets) {
      const thread: PanelMessage[] = [];
      for (const m of messages) {
        if (m.author === 'client') {
          const text = ownTexts.get(m.id) ?? null;
          thread.push({ id: m.id, author: 'client', createdAt: m.createdAt, text, template: null, state: text === null ? 'missing' : 'ok', signed: false });
        } else if ('template' in m) {
          thread.push({ id: m.id, author: 'velarys', createdAt: m.createdAt, text: null, template: m.template, state: 'ok', signed: false });
        } else if (replyKey) {
          thread.push(await this.openReply(m, t.id, id.value, replyKey));
        }
      }
      tickets.push({ ...t, text: firstTexts.get(t.id) ?? null, thread });
    }
    return { ok: true, value: tickets };
  }
}
