import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Value from 'typebox/value';
import {
  generateHubKeyPair,
  generateSealKeyPair,
  HUB_PATHS,
  openSealedText,
  PINNED_SEAL_KEYS,
  publicKeyFromJwk,
  TICKET_MESSAGE_MAX_CHARS,
  TicketCreateRequest,
  verifyRequest,
  type SealPublicKey,
  type TicketSummary,
} from '@velarys/hub-api';
import type { KeyObject } from 'node:crypto';
import type { HubIdentity } from '../src/identity.js';
import { setLogLevel } from '../src/log.js';
import { createPanelServer, PANEL_CSRF_HEADER } from '../src/panel.js';
import { resolveSealKey, TicketService } from '../src/tickets.js';

setLogLevel('error');

/**
 * Faux central des demandes : vérifie la signature du hub, ouvre l'enveloppe avec sa clé privée de
 * scellement (comme le vrai), garde le texte reçu pour que le test le compare, et ne renvoie au hub
 * que des statuts.
 */
class TicketCentral {
  server!: Server;
  url = '';
  seal!: { privateKey: string; publicKey: SealPublicKey };
  hubKeys = new Map<string, KeyObject>();
  received: { hubId: string; kind: string; text: string }[] = [];
  tickets: (TicketSummary & { hubId: string })[] = [];
  createReply: { status: number; body: unknown } | null = null;
  sealKeyStatus = 200;

  async start() {
    this.seal = await generateSealKeyPair();
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', async () => {
        const send = (status: number, payload: unknown) => {
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(JSON.stringify(payload));
        };
        if (req.method === 'GET' && req.url === HUB_PATHS.sealKey) {
          if (this.sealKeyStatus !== 200) return send(this.sealKeyStatus, { error: 'tickets_disabled', message: 'coupé' });
          return send(200, { alg: 'hpke-x25519-hkdfsha256-aes128gcm', ...this.seal.publicKey });
        }
        const raw = Buffer.concat(chunks);
        const verified = await verifyRequest(
          { method: req.method!, url: `http://${req.headers.host}${req.url}`, headers: req.headers, body: raw },
          { resolveKey: (id) => this.hubKeys.get(id) ?? null },
        );
        if (!verified.ok) return send(401, { error: 'invalid_signature', message: verified.reason });
        const body = JSON.parse(raw.toString('utf8')) as unknown;
        if (req.url === HUB_PATHS.tickets) {
          if (this.createReply) return send(this.createReply.status, this.createReply.body);
          if (!Value.Check(TicketCreateRequest, body)) return send(400, { error: 'invalid_request', message: 'hors contrat' });
          const text = await openSealedText(this.seal.privateKey, body.sealed, verified.keyId, body.kind);
          this.received.push({ hubId: verified.keyId, kind: body.kind, text });
          const now = new Date().toISOString();
          const ticket = { id: crypto.randomUUID(), kind: body.kind, status: 'new' as const, outcome: null, createdAt: now, updatedAt: now };
          this.tickets.unshift({ ...ticket, hubId: verified.keyId });
          return send(201, { ticket });
        }
        if (req.url === HUB_PATHS.ticketList) {
          return send(200, { tickets: this.tickets.filter((t) => t.hubId === verified.keyId).map(({ hubId: _, ...t }) => t) });
        }
        send(404, { error: 'not_found', message: '' });
      });
    });
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  stop() {
    return new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

let central: TicketCentral;
let dir: string;
let identity: HubIdentity | null;

function enrolledIdentity(): HubIdentity {
  const pair = generateHubKeyPair();
  central.hubKeys.set('hub-1', publicKeyFromJwk(pair.publicKeyJwk));
  return { hubId: 'hub-1', privateKeyPem: pair.privateKeyPem, centralUrl: central.url, enrolledAt: new Date().toISOString() };
}

function service() {
  return new TicketService({ centralUrl: central.url, loadIdentity: async () => identity, file: join(dir, 'tickets.json') });
}

beforeEach(async () => {
  central = new TicketCentral();
  await central.start();
  dir = await mkdtemp(join(tmpdir(), 'velarys-tickets-'));
  identity = enrolledIdentity();
});

afterEach(async () => {
  await central.stop();
  await rm(dir, { recursive: true, force: true });
});

describe('demandes depuis le hub', () => {
  it('scelle le texte pour le central : il n’apparaît pas dans la requête, le central le lit', async () => {
    const tickets = service();
    const res = await tickets.create('assistance', '  Le volet du salon ne répond plus.\r\n');
    expect(res.ok).toBe(true);
    expect(central.received).toEqual([{ hubId: 'hub-1', kind: 'assistance', text: 'Le volet du salon ne répond plus.' }]);
    const local = JSON.parse(await readFile(join(dir, 'tickets.json'), 'utf8')) as { tickets: { text: string }[] };
    expect(local.tickets[0]!.text).toBe('Le volet du salon ne répond plus.');
  });

  it('liste : statuts du central, textes de la copie locale, rien pour une demande absente du hub', async () => {
    const tickets = service();
    await tickets.create('evolution', 'Ajouter le portail au scénario du soir');
    const now = new Date().toISOString();
    central.tickets.push({ id: crypto.randomUUID(), hubId: 'hub-1', kind: 'assistance', status: 'closed', outcome: 'done', createdAt: now, updatedAt: now });
    const res = await tickets.list();
    expect(res.ok && res.value.map((t) => [t.kind, t.status, t.text])).toEqual([
      ['evolution', 'new', 'Ajouter le portail au scénario du soir'],
      ['assistance', 'closed', null],
    ]);
  });

  it('refuse sans rien envoyer : message vide, trop long, hub non enrôlé ou révoqué', async () => {
    const tickets = service();
    expect(await tickets.create('assistance', '   ')).toMatchObject({ ok: false, error: 'empty' });
    expect(await tickets.create('assistance', 'é'.repeat(TICKET_MESSAGE_MAX_CHARS + 1))).toMatchObject({ ok: false, error: 'message_too_long' });
    identity = null;
    expect(await tickets.create('assistance', 'bonjour')).toMatchObject({ ok: false, error: 'not_enrolled' });
    identity = { ...enrolledIdentity(), revokedAt: new Date().toISOString() };
    expect(await tickets.create('assistance', 'bonjour')).toMatchObject({ ok: false, error: 'revoked' });
    expect(central.received).toHaveLength(0);
  });

  it('remonte les refus typés du central', async () => {
    central.createReply = { status: 429, body: { error: 'rate_limited', message: 'trop' } };
    expect(await service().create('assistance', 'bonjour')).toMatchObject({ ok: false, error: 'rate_limited' });
  });

  it('central sans clé de scellement : demandes coupées', async () => {
    central.sealKeyStatus = 403;
    expect(await service().create('assistance', 'bonjour')).toMatchObject({ ok: false, error: 'tickets_disabled' });
  });

  it('central de production : n’utilise que la clé épinglée, jamais celle du réseau', async () => {
    let fetched = false;
    const fetchImpl = (async () => {
      fetched = true;
      return new Response('{}');
    }) as typeof fetch;
    const res = await resolveSealKey('https://hub.velarys.fr', fetchImpl);
    expect(fetched).toBe(false);
    const pinned = PINNED_SEAL_KEYS['https://hub.velarys.fr']!;
    if (pinned.length === 0) expect(res).toMatchObject({ ok: false, error: 'tickets_disabled' });
    else expect(res).toEqual({ ok: true, value: pinned[0] });
  });

  it('refuse une clé servie dont l’identifiant ne correspond pas', async () => {
    const other = await generateSealKeyPair();
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ alg: 'hpke-x25519-hkdfsha256-aes128gcm', kid: other.publicKey.kid, publicKey: central.seal.publicKey.publicKey }))) as typeof fetch;
    expect(await resolveSealKey(central.url, fetchImpl)).toMatchObject({ ok: false, error: 'rejected' });
  });
});

describe('panneau (ingress)', () => {
  let panel: Server;
  let panelUrl: string;

  async function startPanel(allowedPeers: string[]) {
    panel = createPanelServer({ tickets: service(), agentVersion: '0.3.0-beta.1', allowedPeers });
    await new Promise<void>((resolve) => panel.listen(0, '127.0.0.1', resolve));
    panelUrl = `http://127.0.0.1:${(panel.address() as AddressInfo).port}`;
  }

  afterEach(() => new Promise<void>((resolve) => panel.close(() => resolve())));

  it('ne répond qu’au proxy d’ingress', async () => {
    await startPanel(['172.30.32.2']);
    expect((await fetch(`${panelUrl}/`)).status).toBe(403);
    expect((await fetch(`${panelUrl}/api/tickets`)).status).toBe(403);
  });

  it('sert la page avec une CSP stricte, sans ressource externe', async () => {
    await startPanel(['127.0.0.1']);
    const res = await fetch(`${panelUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    const html = await res.text();
    expect(html).not.toMatch(/https?:\/\//);
    expect((await fetch(`${panelUrl}/panel.js`)).headers.get('content-type')).toContain('javascript');
  });

  it('exige l’en-tête anti-CSRF pour envoyer', async () => {
    await startPanel(['127.0.0.1']);
    const res = await fetch(`${panelUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'assistance', message: 'bonjour' }),
    });
    expect(res.status).toBe(403);
    expect(central.received).toHaveLength(0);
  });

  it('envoie puis liste une demande, de bout en bout', async () => {
    await startPanel(['127.0.0.1']);
    const sent = await fetch(`${panelUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [PANEL_CSRF_HEADER]: '1' },
      body: JSON.stringify({ kind: 'evolution', message: 'Éclairer l’allée quand le portail s’ouvre' }),
    });
    expect(sent.status).toBe(201);
    expect(central.received[0]!.text).toBe('Éclairer l’allée quand le portail s’ouvre');
    const listed = (await (await fetch(`${panelUrl}/api/tickets`)).json()) as { text: string; status: string }[];
    expect(listed).toEqual([expect.objectContaining({ text: 'Éclairer l’allée quand le portail s’ouvre', status: 'new' })]);
  });

  it('traduit les refus en codes HTTP lisibles par la page', async () => {
    await startPanel(['127.0.0.1']);
    identity = null;
    const res = await fetch(`${panelUrl}/api/tickets`);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'not_enrolled' });
  });
});
