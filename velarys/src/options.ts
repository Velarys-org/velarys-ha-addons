import { readFile } from 'node:fs/promises';
import { HEARTBEAT_INTERVAL_DEFAULT_SEC } from '@velarys/hub-api';
import type { LogLevel } from './log.js';
import { OPTIONS_FILE } from './paths.js';

/** Options de l'add-on, telles que le Supervisor les écrit dans /data/options.json (voir config.yaml). */
export interface AddonOptions {
  central_url: string;
  enrollment_code?: string;
  hub_name?: string;
  /** Intervalle souhaité par défaut ; le central peut en imposer un autre à chaque réponse. */
  heartbeat_interval: number;
  log_level: LogLevel;
}

export async function readOptions(file = OPTIONS_FILE): Promise<AddonOptions> {
  const raw = JSON.parse(await readFile(file, 'utf8')) as Partial<AddonOptions>;
  return {
    central_url: (raw.central_url ?? 'https://hub.velarys.fr').replace(/\/+$/, ''),
    ...(raw.enrollment_code?.trim() ? { enrollment_code: raw.enrollment_code.trim() } : {}),
    ...(raw.hub_name?.trim() ? { hub_name: raw.hub_name.trim() } : {}),
    heartbeat_interval: raw.heartbeat_interval ?? HEARTBEAT_INTERVAL_DEFAULT_SEC,
    log_level: raw.log_level ?? 'info',
  };
}
