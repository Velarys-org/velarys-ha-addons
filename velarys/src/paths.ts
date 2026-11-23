import { join } from 'node:path';

/** `/data` dans le conteneur de l'add-on ; surchargé par DATA_DIR pour les essais hors Home Assistant. */
export const DATA_DIR = process.env['DATA_DIR'] ?? '/data';
export const OPTIONS_FILE = join(DATA_DIR, 'options.json');
/** Exclu des sauvegardes HA (`backup_exclude` dans config.yaml) : la clé privée ne part jamais dans une sauvegarde. */
export const IDENTITY_DIR = join(DATA_DIR, 'identity');
export const IDENTITY_FILE = join(IDENTITY_DIR, 'identity.json');
/** Copie locale des demandes envoyées depuis ce hub (le texte du client), pour le panneau. */
export const TICKETS_FILE = join(DATA_DIR, 'tickets.json');
