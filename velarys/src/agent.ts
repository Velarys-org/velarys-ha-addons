import {
  ENROLL_KEY_ID,
  generateHubKeyPair,
  HEARTBEAT_INTERVAL_MAX_SEC,
  HEARTBEAT_INTERVAL_MIN_SEC,
  HEARTBEAT_SCHEMA_V1,
  HUB_PATHS,
  privateKeyFromPem,
  type EnrollRequest,
  type EnrollResponse,
  type HealthV1,
  type HeartbeatResponse,
  type HeartbeatV1,
} from '@velarys/hub-api';
import { signedPost, type CentralResult } from './central.js';
import type { HubIdentity } from './identity.js';
import { log } from './log.js';
import type { AddonOptions } from './options.js';
import type { HostFacts } from './supervisor.js';

/** Dépendances injectées : le Supervisor, le disque et l'horloge se simulent dans les tests. */
export interface AgentDeps {
  agentVersion: string;
  options: AddonOptions;
  rawOptions: Record<string, unknown>;
  facts(): Promise<HostFacts>;
  /** Résumé de santé (mis en cache, cf. `HealthCache`) ; absent ou `null` = pas de bloc `health`. */
  health?(): Promise<HealthV1 | null>;
  clearEnrollmentCode(rawOptions: Record<string, unknown>): Promise<boolean>;
  loadIdentity(): Promise<HubIdentity | null>;
  saveIdentity(identity: HubIdentity): Promise<void>;
  sleep(ms: number): Promise<void>;
  post?: typeof signedPost;
}

/** Erreurs d'enrôlement définitives : réessayer avec le même code n'y changera rien. */
const ENROLL_FATAL = new Set(['code_invalid', 'code_used', 'code_expired', 'key_already_enrolled', 'invalid_request']);

const HINTS: Record<string, string> = {
  code_invalid: 'code inconnu du central : vérifier la saisie, ou en générer un nouveau',
  code_used: 'code déjà utilisé : en générer un nouveau depuis le central',
  code_expired: 'code expiré : en générer un nouveau depuis le central',
};

export function buildHeartbeat(
  facts: HostFacts,
  agentVersion: string,
  now = new Date(),
  health: HealthV1 | null = null,
): HeartbeatV1 {
  return {
    schema: HEARTBEAT_SCHEMA_V1,
    sentAt: now.toISOString(),
    agent: { version: agentVersion },
    ha: { reachable: facts.haReachable, version: facts.haVersion },
    supervisor: { version: facts.supervisorVersion, healthy: facts.supervisorHealthy },
    os: { version: facts.osVersion },
    host: { uptimeSec: facts.uptimeSec },
    addon: { watchdog: facts.addonWatchdog, autoUpdate: facts.addonAutoUpdate, boot: facts.addonBoot },
    ...(health ? { health } : {}),
  };
}

export function clampInterval(sec: number): number {
  return Math.min(HEARTBEAT_INTERVAL_MAX_SEC, Math.max(HEARTBEAT_INTERVAL_MIN_SEC, Math.round(sec)));
}

/** ±10 % pour que des hubs redémarrés ensemble (coupure de courant) ne battent pas en même temps. */
export function withJitter(sec: number, random = Math.random): number {
  return Math.round(sec * 1000 * (0.9 + 0.2 * random()));
}

/** Délai de nouvelle tentative après un échec réseau : 30 s, 60 s, 120 s… plafonné à l'intervalle. */
export function retryDelaySec(failures: number, intervalSec: number): number {
  return Math.min(intervalSec, 30 * 2 ** Math.max(0, failures - 1));
}

export type EnrollOutcome = { kind: 'enrolled'; identity: HubIdentity } | { kind: 'fatal'; error: string } | { kind: 'retry' };

export async function enroll(deps: AgentDeps, code: string): Promise<EnrollOutcome> {
  const post = deps.post ?? signedPost;
  const facts = await deps.facts();
  // Clé neuve à chaque tentative : une clé n'est jamais enrôlée deux fois.
  const pair = generateHubKeyPair();
  const privateKey = privateKeyFromPem(pair.privateKeyPem);
  const request: EnrollRequest = {
    code,
    publicKeyJwk: pair.publicKeyJwk,
    hub: {
      name: deps.options.hub_name ?? facts.hostname ?? 'homeassistant',
      arch: facts.arch,
      haVersion: facts.haVersion,
      osVersion: facts.osVersion,
      agentVersion: deps.agentVersion,
    },
  };
  const result = await post<EnrollResponse>(deps.options.central_url, HUB_PATHS.enroll, request, {
    privateKey,
    keyId: ENROLL_KEY_ID,
  });
  if (result.kind === 'unreachable') {
    log.warning('Central injoignable pendant l’enrôlement, nouvel essai plus tard', { detail: result.detail });
    return { kind: 'retry' };
  }
  if (result.kind === 'rejected') {
    if (ENROLL_FATAL.has(result.error)) {
      log.error(`Enrôlement refusé : ${HINTS[result.error] ?? result.message}`, { error: result.error });
      return { kind: 'fatal', error: result.error };
    }
    log.warning('Enrôlement refusé, nouvel essai plus tard', { error: result.error, message: result.message });
    return { kind: 'retry' };
  }
  const identity: HubIdentity = {
    hubId: result.body.hubId,
    privateKeyPem: pair.privateKeyPem,
    centralUrl: deps.options.central_url,
    enrolledAt: new Date().toISOString(),
  };
  await deps.saveIdentity(identity);
  log.info('Hub enrôlé auprès du central', { hubId: identity.hubId, central: identity.centralUrl });
  if (await deps.clearEnrollmentCode(deps.rawOptions)) log.info('Code d’enrôlement retiré des options');
  else log.warning('Impossible de retirer le code des options : il est déjà consommé, sans risque, le vider à la main');
  return { kind: 'enrolled', identity };
}

export type BeatOutcome =
  | { kind: 'ok'; nextIntervalSec: number }
  | { kind: 'revoked' }
  | { kind: 'unknown' }
  | { kind: 'retry'; reason: string };

export async function beat(deps: AgentDeps, identity: HubIdentity): Promise<BeatOutcome> {
  const post = deps.post ?? signedPost;
  const [facts, health] = await Promise.all([deps.facts(), deps.health ? deps.health() : Promise.resolve(null)]);
  const payload = buildHeartbeat(facts, deps.agentVersion, new Date(), health);
  const result: CentralResult<HeartbeatResponse> = await post<HeartbeatResponse>(
    deps.options.central_url,
    HUB_PATHS.heartbeat,
    payload,
    { privateKey: privateKeyFromPem(identity.privateKeyPem), keyId: identity.hubId },
  );
  if (result.kind === 'ok') {
    log.debug('Battement accepté', { ha: payload.ha.reachable, next: result.body.nextIntervalSec });
    return { kind: 'ok', nextIntervalSec: clampInterval(result.body.nextIntervalSec) };
  }
  if (result.kind === 'unreachable') return { kind: 'retry', reason: result.detail };
  if (result.error === 'revoked') return { kind: 'revoked' };
  if (result.error === 'unknown_hub') return { kind: 'unknown' };
  // Signature refusée, rejeu, schéma : horloge décalée ou central plus récent. On réessaie, en le signalant.
  return { kind: 'retry', reason: `${result.error}: ${result.message}` };
}

/**
 * Boucle principale. Ne se termine jamais : un add-on qui s'arrête serait relancé en boucle par le
 * watchdog. Quand il n'y a rien à faire (pas de code, hub révoqué), l'agent attend et le redit chaque heure.
 */
export async function run(deps: AgentDeps): Promise<never> {
  let identity = await deps.loadIdentity();
  const code = deps.options.enrollment_code;

  if (identity && !identity.revokedAt && identity.centralUrl !== deps.options.central_url) {
    log.warning('Le central configuré diffère de celui de l’enrôlement', {
      enrolled: identity.centralUrl,
      configured: deps.options.central_url,
    });
  }

  if (!identity || identity.revokedAt) {
    if (!code) {
      const why = identity?.revokedAt ? 'Hub révoqué par le central' : 'Hub non enrôlé';
      return idle(deps, `${why} : saisir un code d’enrôlement dans la configuration de l’add-on, puis redémarrer`);
    }
    let failures = 0;
    for (;;) {
      const outcome = await enroll(deps, code);
      if (outcome.kind === 'enrolled') {
        identity = outcome.identity;
        break;
      }
      if (outcome.kind === 'fatal') return idle(deps, 'Enrôlement impossible avec ce code : saisir un nouveau code, puis redémarrer');
      failures += 1;
      await deps.sleep(retryDelaySec(failures, deps.options.heartbeat_interval) * 1000);
    }
  } else if (code) {
    log.info('Hub déjà enrôlé : le code saisi est ignoré', { hubId: identity.hubId });
  }

  let intervalSec = clampInterval(deps.options.heartbeat_interval);
  let failures = 0;
  log.info('Battement de cœur démarré', { hubId: identity.hubId, intervalSec });
  for (;;) {
    const outcome = await beat(deps, identity);
    if (outcome.kind === 'ok') {
      if (failures > 0) log.info('Central de nouveau joignable', { after: failures });
      failures = 0;
      intervalSec = outcome.nextIntervalSec;
      await deps.sleep(withJitter(intervalSec));
      continue;
    }
    if (outcome.kind === 'revoked' || outcome.kind === 'unknown') {
      const revokedAt = new Date().toISOString();
      await deps.saveIdentity({ ...identity, revokedAt });
      const why = outcome.kind === 'revoked' ? 'Hub révoqué par le central' : 'Hub inconnu du central';
      return idle(deps, `${why} : battement arrêté. Saisir un nouveau code d’enrôlement, puis redémarrer`);
    }
    failures += 1;
    log.warning('Battement non remis, nouvel essai', { reason: outcome.reason, failures });
    await deps.sleep(retryDelaySec(failures, intervalSec) * 1000);
  }
}

async function idle(deps: AgentDeps, message: string): Promise<never> {
  for (;;) {
    log.warning(message);
    await deps.sleep(3600 * 1000);
  }
}
