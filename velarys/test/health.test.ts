import { describe, expect, it } from 'vitest';
import Value from 'typebox/value';
import { HealthV1 } from '@velarys/hub-api';
import type { HaWs } from '../src/ha-ws.js';
import { collectHealth, HealthCache, toCode, type HealthSources } from '../src/health.js';
import { setLogLevel } from '../src/log.js';

setLogLevel('error');
const NOW = new Date('2026-11-23T12:00:00.000Z');

/** Réponses du Supervisor (`data`) par chemin ; absent = appel en échec. */
const SUPERVISOR: Record<string, unknown> = {
  '/core/info': { version: '2026.11.2', version_latest: '2026.11.3', update_available: true },
  '/os/info': { version: '17.0', version_latest: '17.0', update_available: false },
  '/supervisor/info': {
    version: '2026.11.1',
    version_latest: '2026.11.1',
    update_available: false,
    addons: [
      { slug: 'core_mosquitto', version: '6.4.1', version_latest: '6.5.0', update_available: true },
      { slug: '9b75d163_velarys', version: '0.2.0', version_latest: '0.2.0', update_available: false },
    ],
  },
  '/host/info': { disk_total: 31.25, disk_free: 4.54, hostname: 'maison-dupont' },
  '/resolution/info': { unhealthy: [], unsupported: ['os_agent'] },
};

/** Réponses du WebSocket de HA par type de commande ; une `Error` = commande refusée. */
const WS: Record<string, unknown> = {
  'config/entity_registry/list': [
    { entity_id: 'update.home_assistant_core_update', platform: 'hassio', name: null },
    { entity_id: 'update.hacs_mushroom', platform: 'hacs', name: 'Mushroom' },
    { entity_id: 'update.volet_chambre_de_lea', platform: 'mqtt', name: 'Volet chambre de Léa' },
  ],
  get_states: [
    { entity_id: 'update.home_assistant_core_update', state: 'on' },
    { entity_id: 'update.hacs_mushroom', state: 'on' },
    { entity_id: 'update.volet_chambre_de_lea', state: 'on' },
    { entity_id: 'light.salon', state: 'on' },
  ],
  'backup/config/info': {
    config: {
      create_backup: { agent_ids: ['hassio.local', 'hassio.NAS_Dupont'] },
      last_attempted_automatic_backup: '2026-11-23T03:00:00+00:00',
      last_completed_automatic_backup: '2026-11-22T03:05:00+00:00',
    },
  },
  'backup/info': { backups: [{ date: '2026-11-22T03:00:00+00:00', name: 'Automatic backup' }] },
  'config_entries/get': [
    { domain: 'netatmo', title: 'Maison Dupont', state: 'setup_retry' },
    { domain: 'zha', title: 'Zigbee', state: 'loaded' },
    { domain: 'netatmo', title: 'Chalet Dupont', state: 'setup_error' },
  ],
  'repairs/list_issues': {
    issues: [
      { domain: 'zha', issue_id: 'zha_volet_chambre_de_lea', translation_key: 'inconsistent_network_settings', severity: 'error', ignored: false },
      { domain: 'spook', issue_id: 'unknown_entity_x', translation_key: 'automation_unknown_entity_references', severity: 'warning', ignored: false },
      { domain: 'homeassistant', issue_id: 'deprecated_yaml_x', translation_key: 'deprecated_yaml', severity: 'warning', ignored: false },
      { domain: 'hacs', issue_id: 'r1', translation_key: 'restart_required', severity: 'warning', ignored: true },
    ],
  },
};

function sources(overrides: { supervisor?: Record<string, unknown>; ws?: Record<string, unknown> | 'down' } = {}) {
  const sup = { ...SUPERVISOR, ...overrides.supervisor };
  const wsAnswers = overrides.ws === 'down' ? null : { ...WS, ...overrides.ws };
  const sent: string[] = [];
  let closed = false;
  const src: HealthSources = {
    supervisor: async <T>(path: string) => (path in sup ? (sup[path] as T | null) : null),
    openWs: async () => {
      if (!wsAnswers) throw new Error('WebSocket de HA injoignable');
      const ws: HaWs = {
        async command<T>(message: Record<string, unknown>) {
          const type = String(message['type']);
          sent.push(type);
          const answer = wsAnswers[type];
          if (answer instanceof Error || answer === undefined) throw answer ?? new Error(`unknown_command: ${type}`);
          return answer as T;
        },
        close() {
          closed = true;
        },
      };
      return ws;
    },
  };
  return { src, sent, isClosed: () => closed };
}

describe('relevé de santé', () => {
  it('lit tout et respecte le contrat', async () => {
    const { src, isClosed } = sources();
    const h = await collectHealth(src, NOW);
    expect(Value.Check(HealthV1, h)).toBe(true);
    expect(h).toEqual({
      collectedAt: NOW.toISOString(),
      updates: {
        items: [
          { component: 'core', version: '2026.11.2', latest: '2026.11.3' },
          { component: 'addon', slug: 'core_mosquitto', version: '6.4.1', latest: '6.5.0' },
        ],
        // Mushroom (HACS) et le firmware du volet : comptés, pas nommés ; la mise à jour de HA est déjà au-dessus.
        otherCount: 2,
      },
      backup: {
        lastSuccessAt: '2026-11-22T03:05:00.000Z',
        lastAttemptAt: '2026-11-23T03:00:00.000Z',
        lastAttemptFailed: true,
        offHubCopy: true,
      },
      disk: { totalGb: 31.3, freeGb: 4.5 },
      integrations: [{ domain: 'netatmo', state: 'setup_error' }],
      repairs: [{ domain: 'zha', key: 'inconsistent_network_settings', severity: 'error' }],
      system: { unhealthy: [], unsupported: ['os_agent'] },
      probeErrors: [],
    });
    expect(isClosed()).toBe(true);
  });

  it('ne laisse sortir ni titre, ni entity_id, ni nom d’appareil ou d’emplacement', async () => {
    const text = JSON.stringify(await collectHealth(sources().src, NOW));
    for (const leak of ['Dupont', 'Léa', 'lea', 'Mushroom', 'mushroom', 'update.', 'NAS', 'maison-dupont', 'Zigbee']) {
      expect(text).not.toContain(leak);
    }
  });

  it('copie hors du hub : non avec le seul stockage local, inconnue sans configuration', async () => {
    const local = sources({
      ws: { 'backup/config/info': { config: { create_backup: { agent_ids: ['hassio.local'] } } } },
    });
    expect((await collectHealth(local.src, NOW)).backup).toMatchObject({ offHubCopy: false, lastAttemptAt: null, lastAttemptFailed: null });
    const cloud = sources({ ws: { 'backup/config/info': { config: { create_backup: { agent_ids: ['backup.local', 'cloud.cloud'] } } } } });
    expect((await collectHealth(cloud.src, NOW)).backup?.offHubCopy).toBe(true);
    const none = sources({ ws: { 'backup/config/info': { config: {} } } });
    expect((await collectHealth(none.src, NOW)).backup?.offHubCopy).toBeNull();
  });

  it('une sauvegarde faite à la main compte comme réussie', async () => {
    const { src } = sources({
      ws: {
        'backup/config/info': { config: { create_backup: { agent_ids: [] } } },
        'backup/info': { backups: [{ date: '2026-11-20T10:00:00Z' }, { date: '2026-11-21T10:00:00Z' }] },
      },
    });
    expect((await collectHealth(src, NOW)).backup?.lastSuccessAt).toBe('2026-11-21T10:00:00.000Z');
  });

  it('une lecture en échec donne null et un code, sans bloquer les autres', async () => {
    const { src } = sources({ ws: { 'repairs/list_issues': new Error('unauthorized') }, supervisor: { '/host/info': null } });
    const h = await collectHealth(src, NOW);
    expect(h.repairs).toBeNull();
    expect(h.disk).toBeNull();
    expect(h.backup).not.toBeNull();
    expect(h.probeErrors).toEqual(['disk', 'repairs']);
    expect(Value.Check(HealthV1, h)).toBe(true);
  });

  it('WebSocket injoignable : seules les lectures du Supervisor restent', async () => {
    const h = await collectHealth(sources({ ws: 'down' }).src, NOW);
    expect(h).toMatchObject({ backup: null, integrations: null, repairs: null, disk: { totalGb: 31.3 } });
    expect(h.updates?.otherCount).toBe(0);
    expect(h.probeErrors).toEqual(['backup', 'integrations', 'repairs', 'updates_other']);
    expect(Value.Check(HealthV1, h)).toBe(true);
  });

  it('ramène les identifiants au format du contrat', () => {
    expect(toCode('Inconsistent Network')).toBe('inconsistent_network');
    expect(toCode('')).toBeNull();
    expect(toCode(42)).toBeNull();
  });
});

describe('relevé en cache', () => {
  it('ne relit qu’après le délai, et garde le précédent si un relevé échoue', async () => {
    let t = 0;
    let calls = 0;
    let fail = false;
    const cache = new HealthCache(
      async () => {
        calls++;
        if (fail) throw new Error('boom');
        return collectHealth(sources().src, NOW);
      },
      900,
      () => t,
    );
    const first = await cache.get();
    t += 600_000;
    expect(await cache.get()).toBe(first);
    expect(calls).toBe(1);
    t += 400_000;
    fail = true;
    expect(await cache.get()).toBe(first);
    expect(calls).toBe(2);
  });
});
