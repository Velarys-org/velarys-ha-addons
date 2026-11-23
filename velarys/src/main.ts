import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { HUB_API_VERSION } from '@velarys/hub-api';
import { run } from './agent.js';
import { openHaWs } from './ha-ws.js';
import { collectHealth, HealthCache } from './health.js';
import { loadIdentity, saveIdentity } from './identity.js';
import { log, setLogLevel } from './log.js';
import { readOptions } from './options.js';
import { OPTIONS_FILE } from './paths.js';
import { SupervisorClient } from './supervisor.js';

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
const options = await readOptions();
setLogLevel(options.log_level);
const rawOptions = JSON.parse(await readFile(OPTIONS_FILE, 'utf8')) as Record<string, unknown>;

const token = process.env['SUPERVISOR_TOKEN'];
if (!token) {
  log.error('SUPERVISOR_TOKEN absent : l’add-on doit tourner sous le Supervisor (hassio_api: true)');
  process.exit(1);
}
const supervisor = new SupervisorClient(token);
const health = new HealthCache(() =>
  collectHealth({ supervisor: (path) => supervisor.data(path), openWs: () => openHaWs(token) }),
);

log.info('Agent Velarys démarré', { version: pkg.version, contract: HUB_API_VERSION, central: options.central_url });

await run({
  agentVersion: pkg.version,
  options,
  rawOptions,
  facts: () => supervisor.facts(),
  health: () => health.get(),
  clearEnrollmentCode: (raw) => supervisor.clearEnrollmentCode(raw),
  loadIdentity: () => loadIdentity(),
  saveIdentity: (identity) => saveIdentity(identity),
  sleep: (ms) => sleep(ms),
});
