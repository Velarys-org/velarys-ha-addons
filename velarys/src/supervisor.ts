import { uptime } from 'node:os';

const TIMEOUT_MS = 10_000;

export interface HostFacts {
  haReachable: boolean;
  haVersion: string | null;
  supervisorVersion: string | null;
  supervisorHealthy: boolean | null;
  osVersion: string | null;
  arch: string;
  hostname: string | null;
  uptimeSec: number | null;
  /** Réglages de l'add-on lui-même (onglet Info) ; `null` = le Supervisor n'a pas répondu. */
  addonWatchdog: boolean | null;
  addonAutoUpdate: boolean | null;
  addonBoot: 'auto' | 'manual' | null;
}

/** Réglages lus dans `/addons/self/info` ; toute valeur inattendue devient inconnue (`null`). */
export function addonSettings(
  info: { watchdog?: unknown; auto_update?: unknown; boot?: unknown } | null,
): Pick<HostFacts, 'addonWatchdog' | 'addonAutoUpdate' | 'addonBoot'> {
  return {
    addonWatchdog: typeof info?.watchdog === 'boolean' ? info.watchdog : null,
    addonAutoUpdate: typeof info?.auto_update === 'boolean' ? info.auto_update : null,
    addonBoot: info?.boot === 'auto' || info?.boot === 'manual' ? info.boot : null,
  };
}

/**
 * Durée de fonctionnement de l'hôte. `boot_timestamp` (microsecondes) vaut 0 sur certaines
 * installations (constaté sur HAOS 18.4 en VM) : on se rabat alors sur l'uptime du noyau, que le
 * conteneur partage avec l'hôte.
 */
export function hostUptimeSec(bootTimestampUs: number | undefined, nowMs = Date.now(), kernelUptimeSec = uptime()): number {
  if (typeof bootTimestampUs === 'number' && bootTimestampUs > 0) {
    const sec = Math.round(nowMs / 1000 - bootTimestampUs / 1e6);
    if (sec >= 0) return sec;
  }
  return Math.round(kernelUptimeSec);
}

/** Client minimal de l'API Supervisor (`http://supervisor`, jeton SUPERVISOR_TOKEN). */
export class SupervisorClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl = process.env['SUPERVISOR_URL'] ?? 'http://supervisor',
  ) {}

  private async call(method: 'GET' | 'POST', path: string, body?: unknown): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  /** Réponses du Supervisor : `{ result: "ok", data: {...} }`. `null` si l'appel échoue. */
  async data<T>(path: string): Promise<T | null> {
    try {
      const res = await this.call('GET', path);
      if (!res.ok) return null;
      const json = (await res.json()) as { result?: string; data?: T };
      return json.result === 'ok' && json.data ? json.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Home Assistant répond-il ? Passe par le proxy du Supervisor vers l'API de Core : c'est le seul
   * cas que l'agent voit lui-même (HA muet alors que le Supervisor et l'add-on tournent).
   */
  async homeAssistantReachable(): Promise<boolean> {
    try {
      const res = await this.call('GET', '/core/api/');
      return res.ok;
    } catch {
      return false;
    }
  }

  async facts(): Promise<HostFacts> {
    const [core, sup, os, host, self, reachable] = await Promise.all([
      this.data<{ version?: string; arch?: string }>('/core/info'),
      this.data<{ version?: string; healthy?: boolean; arch?: string }>('/supervisor/info'),
      this.data<{ version?: string }>('/os/info'),
      this.data<{ hostname?: string | null; boot_timestamp?: number }>('/host/info'),
      this.data<{ watchdog?: unknown; auto_update?: unknown; boot?: unknown }>('/addons/self/info'),
      this.homeAssistantReachable(),
    ]);
    return {
      haReachable: reachable,
      haVersion: core?.version ?? null,
      supervisorVersion: sup?.version ?? null,
      supervisorHealthy: typeof sup?.healthy === 'boolean' ? sup.healthy : null,
      osVersion: os?.version ?? null,
      arch: sup?.arch ?? core?.arch ?? process.arch,
      hostname: host?.hostname ?? null,
      uptimeSec: hostUptimeSec(host?.boot_timestamp),
      ...addonSettings(self),
    };
  }


  /**
   * Affiche le panneau Velarys dans la barre latérale. Le Supervisor l'installe masqué
   * (`ingress_panel: false`), où un client ne le trouverait pas. Seul ce réglage est envoyé : les
   * options de l'add-on n'y sont pas touchées.
   */
  async showIngressPanel(): Promise<boolean> {
    try {
      const res = await this.call('POST', '/addons/self/options', { ingress_panel: true });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Retire le code d'enrôlement des options une fois utilisé. Les options sont remplacées en bloc,
   * d'où l'envoi de toutes les autres telles quelles.
   */
  async clearEnrollmentCode(current: Record<string, unknown>): Promise<boolean> {
    const { enrollment_code: _, ...rest } = current;
    try {
      const res = await this.call('POST', '/addons/self/options', { options: rest });
      return res.ok;
    } catch {
      return false;
    }
  }
}
