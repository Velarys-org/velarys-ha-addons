import { access, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { HUB_API_VERSION } from '@velarys/hub-api';
import { run } from './agent.js';
import { openHaWs } from './ha-ws.js';
import { collectHealth, HealthCache } from './health.js';
import { loadIdentity, saveIdentity } from './identity.js';
import { log, setLogLevel } from './log.js';
import { readOptions } from './options.js';
import { startPanel } from './panel.js';
import { OPTIONS_FILE, PANEL_SHOWN_FILE } from './paths.js';
import { SupervisorClient } from './supervisor.js';
import { TicketService } from './tickets.js';

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

// Panneau des demandes (ingress). Une panne du panneau n'arrête jamais le battement.
const tickets = new TicketService({ centralUrl: options.central_url, loadIdentity: () => loadIdentity() });
const allowedPeers = process.env['PANEL_ALLOWED_PEERS']?.split(',').map((p) => p.trim()).filter(Boolean);
// Le Supervisor installe le panneau masqué : on l'affiche une fois, au premier démarrage. Si le
// client le masque ensuite, le témoin l'empêche de réapparaître.
if (!(await access(PANEL_SHOWN_FILE).then(() => true, () => false))) {
  if (await supervisor.showIngressPanel()) {
    await writeFile(PANEL_SHOWN_FILE, `${new Date().toISOString()}\n`);
    log.info('Panneau Velarys affiché dans la barre latérale');
  } else log.warning('Impossible d’afficher le panneau dans la barre latérale : le cocher dans l’onglet Info de l’add-on');
}
await startPanel({ tickets, agentVersion: pkg.version, ...(allowedPeers?.length ? { allowedPeers } : {}) }).catch((error: Error) =>
  log.error('Panneau Velarys indisponible', { detail: error.message }),
);

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
