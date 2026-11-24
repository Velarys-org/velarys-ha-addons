import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { IDENTITY_FILE } from './paths.js';

/** Identité durable du hub : la clé privée ne quitte jamais le logement. */
export interface HubIdentity {
  hubId: string;
  privateKeyPem: string;
  centralUrl: string;
  enrolledAt: string;
  /** Posé quand le central répond « révoqué » : il faut un nouveau code pour se réenrôler. */
  revokedAt?: string;
  /**
   * Clé X25519 du hub pour les réponses de Velarys (contrat 0.5.0) : le central les scelle pour elle.
   * Créée au premier besoin, gardée ici donc hors des sauvegardes, comme la clé de signature.
   */
  replyKey?: { privateKey: string; publicKey: { kid: string; publicKey: string } };
}

export async function loadIdentity(file = IDENTITY_FILE): Promise<HubIdentity | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as HubIdentity;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Écriture atomique, fichier en 0600 dans un dossier en 0700. */
export async function saveIdentity(identity: HubIdentity, file = IDENTITY_FILE): Promise<void> {
  const dir = dirname(file);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const tmp = `${file}.tmp`;
  await writeFile(tmp, `${JSON.stringify(identity, null, 2)}\n`, { mode: 0o600 });
  await rename(tmp, file);
}
