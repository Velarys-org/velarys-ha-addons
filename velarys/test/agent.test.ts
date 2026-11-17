import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Value from 'typebox/value';
import {
  ENROLL_KEY_ID,
  HeartbeatV1,
  HUB_PATHS,
  publicKeyFromJwk,
  verifyRequest,
  type EnrollRequest,
} from '@velarys/hub-api';
import type { KeyObject } from 'node:crypto';
import { buildHeartbeat, retryDelaySec, run, withJitter, type AgentDeps } from '../src/agent.js';
import type { HubIdentity } from '../src/identity.js';
import { setLogLevel } from '../src/log.js';
import type { HostFacts } from '../src/supervisor.js';

setLogLevel('error');

const FACTS: HostFacts = {
  haReachable: true,
  haVersion: '2026.11.2',
  supervisorVersion: '2026.11.0',
  supervisorHealthy: true,
  osVersion: '17.0',
  arch: 'amd64',
  hostname: 'homeassistant',
  uptimeSec: 4242,
};

/** Faux central : vérifie vraiment les signatures avec le contrat vendorisé, puis répond selon le scénario. */
class FakeCentral {
  server!: Server;
  url = '';
  keys = new Map<string, KeyObject>();
  received: { path: string; keyId: string; body: unknown }[] = [];
  heartbeatReply: { status: number; body: unknown } = { status: 200, body: { accepted: true, nextIntervalSec: 120 } };
  enrollReply: { status: number; body: unknown } | null = null;

  async start() {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', async () => {
        const raw = Buffer.concat(chunks);
        const body = JSON.parse(raw.toString('utf8')) as Record<string, unknown>;
        const verified = await verifyRequest(
          { method: req.method!, url: `http://${req.headers.host}${req.url}`, headers: req.headers, body: raw },
          {
            resolveKey: (id) =>
              id === ENROLL_KEY_ID ? publicKeyFromJwk((body as unknown as EnrollRequest).publicKeyJwk) : (this.keys.get(id) ?? null),
          },
        );
        const send = (status: number, payload: unknown) => {
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(JSON.stringify(payload));
        };
        if (!verified.ok) return send(401, { error: 'invalid_signature', message: verified.reason });
        this.received.push({ path: req.url!, keyId: verified.keyId, body });
        if (req.url === HUB_PATHS.enroll) {
          if (this.enrollReply) return send(this.enrollReply.status, this.enrollReply.body);
          const hubId = `hub-${this.keys.size + 1}`;
          this.keys.set(hubId, publicKeyFromJwk((body as unknown as EnrollRequest).publicKeyJwk));
          return send(201, { hubId, heartbeatIntervalSec: 120 });
        }
        return send(this.heartbeatReply.status, this.heartbeatReply.body);
      });
    });
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  stop() {
    return new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

class Stop extends Error {}

function harness(central: FakeCentral, overrides: Partial<AgentDeps> & { maxSleeps?: number } = {}) {
  const state = {
    identity: null as HubIdentity | null,
    sleeps: [] as number[],
    cleared: 0,
  };
  const maxSleeps = overrides.maxSleeps ?? 3;
  const deps: AgentDeps = {
    agentVersion: '0.1.0',
    options: { central_url: central.url, heartbeat_interval: 300, log_level: 'error', enrollment_code: 'ABCD-EFGH-JKMN-PQRS' },
    rawOptions: { central_url: central.url, enrollment_code: 'ABCD-EFGH-JKMN-PQRS' },
    facts: async () => FACTS,
    clearEnrollmentCode: async () => {
      state.cleared += 1;
      return true;
    },
    loadIdentity: async () => state.identity,
    saveIdentity: async (identity) => {
      state.identity = identity;
    },
    sleep: async (ms) => {
      state.sleeps.push(ms);
      if (state.sleeps.length >= maxSleeps) throw new Stop();
    },
    ...overrides,
  };
  return { deps, state, run: () => run(deps).catch((e) => { if (!(e instanceof Stop)) throw e; }) };
}

let central: FakeCentral;
beforeEach(async () => {
  central = new FakeCentral();
  await central.start();
});
afterEach(() => central.stop());

describe('battement', () => {
  it('respecte le contrat v1', () => {
    expect(Value.Check(HeartbeatV1, buildHeartbeat(FACTS, '0.1.0'))).toBe(true);
    expect(Value.Check(HeartbeatV1, buildHeartbeat({ ...FACTS, haReachable: false, haVersion: null, osVersion: null, uptimeSec: null }, '0.1.0'))).toBe(true);
  });

  it('étale les battements et plafonne les nouvelles tentatives', () => {
    expect(withJitter(100, () => 0)).toBe(90_000);
    expect(withJitter(100, () => 1)).toBe(110_000);
    expect([1, 2, 3, 4, 10].map((n) => retryDelaySec(n, 300))).toEqual([30, 60, 120, 240, 300]);
  });
});

describe('agent', () => {
  it('s’enrôle, retire le code, puis bat au rythme imposé par le central', async () => {
    const h = harness(central);
    await h.run();
    expect(h.state.identity).toMatchObject({ hubId: 'hub-1', centralUrl: central.url });
    expect(h.state.identity!.privateKeyPem).toContain('PRIVATE KEY');
    expect(h.state.cleared).toBe(1);
    const beats = central.received.filter((r) => r.path === HUB_PATHS.heartbeat);
    expect(beats).toHaveLength(3);
    expect(beats.every((b) => b.keyId === 'hub-1')).toBe(true);
    // 120 s imposés par le central, ±10 %.
    for (const ms of h.state.sleeps) expect(ms).toBeGreaterThanOrEqual(108_000), expect(ms).toBeLessThanOrEqual(132_000);
  });

  it('attend sans rien envoyer quand il n’a ni identité ni code', async () => {
    const h = harness(central, { maxSleeps: 1 });
    h.deps.options = { ...h.deps.options };
    delete h.deps.options.enrollment_code;
    await h.run();
    expect(central.received).toHaveLength(0);
    expect(h.state.sleeps).toEqual([3_600_000]);
  });

  it('s’arrête sur un code déjà utilisé, sans retirer le code', async () => {
    central.enrollReply = { status: 409, body: { error: 'code_used', message: 'Code déjà utilisé' } };
    const h = harness(central, { maxSleeps: 1 });
    await h.run();
    expect(h.state.identity).toBeNull();
    expect(h.state.cleared).toBe(0);
    expect(h.state.sleeps).toEqual([3_600_000]);
  });

  it('cesse de battre et le note quand le central le révoque', async () => {
    central.heartbeatReply = { status: 403, body: { error: 'revoked', message: 'Hub révoqué' } };
    const h = harness(central, { maxSleeps: 1 });
    await h.run();
    expect(h.state.identity?.revokedAt).toBeTruthy();
    expect(central.received.filter((r) => r.path === HUB_PATHS.heartbeat)).toHaveLength(1);
    expect(h.state.sleeps).toEqual([3_600_000]);
  });

  it('se réenrôle avec une nouvelle clé après révocation si un nouveau code est saisi', async () => {
    const first = harness(central, { maxSleeps: 1 });
    await first.run();
    const old = first.state.identity!;
    const second = harness(central, { maxSleeps: 1 });
    second.state.identity = { ...old, revokedAt: new Date().toISOString() };
    await second.run();
    expect(second.state.identity!.hubId).toBe('hub-2');
    expect(second.state.identity!.revokedAt).toBeUndefined();
    expect(second.state.identity!.privateKeyPem).not.toBe(old.privateKeyPem);
  });

  it('réessaie en reculant quand le central est injoignable', async () => {
    const h = harness(central, { maxSleeps: 3 });
    h.state.identity = { hubId: 'hub-x', privateKeyPem: '', centralUrl: 'http://127.0.0.1:1', enrolledAt: '' };
    const { generateHubKeyPair } = await import('@velarys/hub-api');
    h.state.identity.privateKeyPem = generateHubKeyPair().privateKeyPem;
    h.deps.options = { ...h.deps.options, central_url: 'http://127.0.0.1:1' };
    await h.run();
    expect(h.state.sleeps).toEqual([30_000, 60_000, 120_000]);
  });

  it('ignore le code quand le hub est déjà enrôlé', async () => {
    const first = harness(central, { maxSleeps: 1 });
    await first.run();
    const again = harness(central, { maxSleeps: 1 });
    again.state.identity = first.state.identity;
    await again.run();
    expect(central.received.filter((r) => r.path === HUB_PATHS.enroll)).toHaveLength(1);
    expect(again.state.identity!.hubId).toBe('hub-1');
  });
});
