import type { HealthUpdate, HealthV1 } from '@velarys/hub-api';
import type { HaWs } from './ha-ws.js';
import { log } from './log.js';

/**
 * Résumé de santé joint au battement (contrat 0.3.0). L'add-on **rapporte** des faits, le central
 * **juge** avec ses seuils : aucun seuil ici.
 *
 * Ne sort que des codes, des versions, des dates et des comptes. Jamais de titre d'intégration,
 * d'`entity_id`, de nom d'appareil, de nom d'emplacement de sauvegarde ni de journal : tout cela est
 * lu ici, localement, et réduit avant de partir.
 */

/** Ce que le relevé lit : le Supervisor (rôle `default`, routes `…/info`) et le WebSocket de HA. */
export interface HealthSources {
  supervisor<T>(path: string): Promise<T | null>;
  openWs(): Promise<HaWs>;
}

/**
 * Réparations écartées, liste **fermée et versionnée** avec l'add-on (décision d'Arnaud du 17/11/2026 :
 * ni Spook ni réparations génériques). Spook s'écarte par son domaine entier.
 */
export const EXCLUDED_REPAIR_DOMAINS: ReadonlySet<string> = new Set(['spook']);
/** Avis génériques de HA, utiles au client, du bruit pour Velarys (`translation_key`). */
export const EXCLUDED_REPAIR_KEYS: ReadonlySet<string> = new Set(['deprecated_yaml', 'deprecated_yaml_import_issue']);

/** Destinations de sauvegarde qui restent sur le hub ; toute autre (cloud, NAS monté…) est hors du hub. */
const LOCAL_BACKUP_AGENTS: ReadonlySet<string> = new Set(['backup.local', 'hassio.local']);

const FAILED_ENTRY_STATES = new Set(['setup_error', 'setup_retry', 'migration_error', 'failed_unload']);

/** Ramène un identifiant au format `Code` du contrat (minuscules, chiffres, `_ . -`, 64 caractères). */
export function toCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.toLowerCase().replace(/[^a-z0-9_.-]/g, '_').slice(0, 64);
  return code.length > 0 ? code : null;
}

const version = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v.slice(0, 64) : null);
const isoDate = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

interface VersionInfo {
  version?: unknown;
  version_latest?: unknown;
  update_available?: unknown;
}

function updateOf(component: HealthUpdate['component'], info: VersionInfo | null, slug?: string): HealthUpdate | null {
  if (!info || info.update_available !== true) return null;
  const current = version(info.version);
  const latest = version(info.version_latest);
  if (!current || !latest) return null;
  return slug ? { component, slug, version: current, latest } : { component, version: current, latest };
}

async function updates(src: HealthSources, ws: HaWs | null, errors: string[]): Promise<HealthV1['updates']> {
  const [core, os, sup] = await Promise.all([
    src.supervisor<VersionInfo>('/core/info'),
    src.supervisor<VersionInfo>('/os/info'),
    src.supervisor<VersionInfo & { addons?: (VersionInfo & { slug?: unknown })[] }>('/supervisor/info'),
  ]);
  if (!core && !os && !sup) {
    errors.push('updates');
    return null;
  }
  const items: HealthUpdate[] = [];
  for (const u of [updateOf('core', core), updateOf('os', os), updateOf('supervisor', sup)]) if (u) items.push(u);
  for (const addon of sup?.addons ?? []) {
    const slug = toCode(addon.slug);
    const u = slug ? updateOf('addon', addon, slug) : null;
    if (u) items.push(u);
  }

  // Autres mises à jour (HACS, firmwares Zigbee…) : entités `update.*` allumées, hors plateforme
  // `hassio` (déjà comptées ci-dessus). Seul leur nombre sort, jamais leur nom.
  let otherCount = 0;
  if (ws) {
    try {
      const [registry, states] = await Promise.all([
        ws.command<{ entity_id: string; platform: string }[]>({ type: 'config/entity_registry/list' }),
        ws.command<{ entity_id: string; state: string }[]>({ type: 'get_states' }),
      ]);
      const platform = new Map(registry.map((e) => [e.entity_id, e.platform]));
      otherCount = states.filter(
        (s) => s.entity_id.startsWith('update.') && s.state === 'on' && platform.get(s.entity_id) !== 'hassio',
      ).length;
    } catch (error) {
      errors.push('updates_other');
      log.debug('Relevé de santé : autres mises à jour illisibles', { error: String(error) });
    }
  } else {
    errors.push('updates_other');
  }
  return { items: items.slice(0, 64), otherCount };
}

interface BackupConfigInfo {
  config?: {
    create_backup?: { agent_ids?: unknown };
    last_attempted_automatic_backup?: unknown;
    last_completed_automatic_backup?: unknown;
  };
}
interface BackupInfo {
  backups?: { date?: unknown; failed_agent_ids?: unknown }[];
  last_attempted_automatic_backup?: unknown;
  last_completed_automatic_backup?: unknown;
}

async function backup(ws: HaWs, errors: string[]): Promise<HealthV1['backup']> {
  try {
    const [configInfo, info] = await Promise.all([
      ws.command<BackupConfigInfo>({ type: 'backup/config/info' }),
      ws.command<BackupInfo>({ type: 'backup/info' }),
    ]);
    const cfg = configInfo.config ?? {};
    const lastAttemptAt = isoDate(cfg.last_attempted_automatic_backup ?? info.last_attempted_automatic_backup);
    const lastAuto = isoDate(cfg.last_completed_automatic_backup ?? info.last_completed_automatic_backup);
    // Une sauvegarde faite à la main compte aussi : on garde la plus récente des deux.
    const newestListed = (info.backups ?? [])
      .map((b) => isoDate(b.date))
      .filter((d): d is string => d !== null)
      .sort()
      .at(-1) ?? null;
    const lastSuccessAt = [lastAuto, newestListed].filter((d): d is string => d !== null).sort().at(-1) ?? null;
    const lastAttemptFailed = lastAttemptAt === null ? null : lastAuto === null || Date.parse(lastAttemptAt) > Date.parse(lastAuto);
    const agentIds = cfg.create_backup?.agent_ids;
    const offHubCopy = Array.isArray(agentIds)
      ? agentIds.some((id) => typeof id === 'string' && !LOCAL_BACKUP_AGENTS.has(id))
      : null;
    return { lastSuccessAt, lastAttemptAt, lastAttemptFailed, offHubCopy };
  } catch (error) {
    errors.push('backup');
    log.debug('Relevé de santé : sauvegardes illisibles', { error: String(error) });
    return null;
  }
}

async function disk(src: HealthSources, errors: string[]): Promise<HealthV1['disk']> {
  const host = await src.supervisor<{ disk_total?: unknown; disk_free?: unknown }>('/host/info');
  if (typeof host?.disk_total !== 'number' || typeof host.disk_free !== 'number') {
    errors.push('disk');
    return null;
  }
  const round = (n: number) => Math.max(0, Math.round(n * 10) / 10);
  return { totalGb: round(host.disk_total), freeGb: round(host.disk_free) };
}

async function integrations(ws: HaWs, errors: string[]): Promise<HealthV1['integrations']> {
  try {
    const entries = await ws.command<{ domain?: unknown; state?: unknown }[]>({ type: 'config_entries/get' });
    const failed = new Map<string, NonNullable<HealthV1['integrations']>[number]['state']>();
    for (const e of entries) {
      const domain = toCode(e.domain);
      if (domain && typeof e.state === 'string' && FAILED_ENTRY_STATES.has(e.state)) {
        failed.set(domain, e.state as NonNullable<HealthV1['integrations']>[number]['state']);
      }
    }
    // Un domaine par ligne, sans le titre de l'entrée (« Maison Dupont » ne sort pas).
    return [...failed].map(([domain, state]) => ({ domain, state })).slice(0, 64);
  } catch (error) {
    errors.push('integrations');
    log.debug('Relevé de santé : intégrations illisibles', { error: String(error) });
    return null;
  }
}

const SEVERITY: Record<string, 'critical' | 'error' | 'warning'> = { critical: 'critical', error: 'error', warning: 'warning' };

async function repairs(ws: HaWs, errors: string[]): Promise<HealthV1['repairs']> {
  try {
    const { issues = [] } = await ws.command<{
      issues?: { domain?: unknown; translation_key?: unknown; severity?: unknown; ignored?: unknown; dismissed_version?: unknown }[];
    }>({ type: 'repairs/list_issues' });
    const out = new Map<string, NonNullable<HealthV1['repairs']>[number]>();
    for (const i of issues) {
      const domain = toCode(i.domain);
      const key = toCode(i.translation_key);
      const severity = typeof i.severity === 'string' ? SEVERITY[i.severity] : undefined;
      if (!domain || !key || !severity || i.ignored === true) continue;
      if (EXCLUDED_REPAIR_DOMAINS.has(domain) || EXCLUDED_REPAIR_KEYS.has(key)) continue;
      // `translation_key`, jamais `issue_id` : ce dernier cite parfois une entité ou un appareil.
      out.set(`${domain}:${key}`, { domain, key, severity });
    }
    return [...out.values()].slice(0, 64);
  } catch (error) {
    errors.push('repairs');
    log.debug('Relevé de santé : réparations illisibles', { error: String(error) });
    return null;
  }
}

async function system(src: HealthSources, errors: string[]): Promise<HealthV1['system']> {
  const info = await src.supervisor<{ unhealthy?: unknown; unsupported?: unknown }>('/resolution/info');
  if (!info) {
    errors.push('system');
    return null;
  }
  const codes = (v: unknown) =>
    (Array.isArray(v) ? v : [])
      .map(toCode)
      .filter((c): c is string => c !== null)
      .slice(0, 32);
  return { unhealthy: codes(info.unhealthy), unsupported: codes(info.unsupported) };
}

/** Un relevé complet. Ne lève jamais : une lecture en échec donne `null` et un code dans `probeErrors`. */
export async function collectHealth(src: HealthSources, now = new Date()): Promise<HealthV1> {
  const errors: string[] = [];
  let ws: HaWs | null = null;
  try {
    ws = await src.openWs();
  } catch (error) {
    log.debug('Relevé de santé : WebSocket de HA injoignable', { error: String(error) });
  }
  try {
    const wsBlock = async <T>(name: string, read: (ws: HaWs) => Promise<T>): Promise<T | null> => {
      if (ws) return read(ws);
      errors.push(name);
      return null;
    };
    const [u, b, d, i, r, s] = await Promise.all([
      updates(src, ws, errors),
      wsBlock('backup', (w) => backup(w, errors)),
      disk(src, errors),
      wsBlock('integrations', (w) => integrations(w, errors)),
      wsBlock('repairs', (w) => repairs(w, errors)),
      system(src, errors),
    ]);
    return {
      collectedAt: now.toISOString(),
      updates: u,
      backup: b,
      disk: d,
      integrations: i,
      repairs: r,
      system: s,
      probeErrors: [...new Set(errors)].sort().slice(0, 16),
    };
  } finally {
    ws?.close();
  }
}

/**
 * Relevé mis en cache : rafraîchi au plus toutes les `refreshSec` secondes (15 min par défaut), joint
 * à chaque battement entre-temps. Un relevé ne bloque jamais un battement : en cas d'erreur
 * inattendue, le précédent est gardé.
 */
export class HealthCache {
  private last: HealthV1 | null = null;
  private lastAt = 0;

  constructor(
    private readonly collect: () => Promise<HealthV1>,
    private readonly refreshSec = 900,
    private readonly clock = () => Date.now(),
  ) {}

  async get(): Promise<HealthV1 | null> {
    if (this.last && this.clock() - this.lastAt < this.refreshSec * 1000) return this.last;
    try {
      this.last = await this.collect();
      this.lastAt = this.clock();
      if (this.last.probeErrors.length > 0) log.debug('Relevé de santé partiel', { probeErrors: this.last.probeErrors });
    } catch (error) {
      log.warning('Relevé de santé en échec, le précédent est gardé', { error: String(error) });
    }
    return this.last;
  }
}
