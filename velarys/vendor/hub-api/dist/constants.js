/** Version du contrat, recopiée dans l'add-on avec le package vendorisé. */
export const HUB_API_VERSION = '0.4.0';
/** Routes publiques, les seules que le tunnel Cloudflare publie (préfixe `/v1/hub/`). */
export const HUB_PATHS = {
    enroll: '/v1/hub/enroll',
    heartbeat: '/v1/hub/heartbeat',
    health: '/v1/hub/health',
    /** Demandes du hub (contrat 0.4.0) : création, liste des statuts, clé de scellement du central. */
    tickets: '/v1/hub/tickets',
    ticketList: '/v1/hub/tickets/list',
    sealKey: '/v1/hub/seal-key',
};
/** Schémas de battement que le central accepte. Le central fait autorité : il en ajoute, il en retire. */
export const HEARTBEAT_SCHEMA_V1 = 'velarys.heartbeat/1';
export const SUPPORTED_HEARTBEAT_SCHEMAS = [HEARTBEAT_SCHEMA_V1];
/** Signature des requêtes (RFC 9421). */
export const SIGNATURE_LABEL = 'velarys';
export const SIGNATURE_ALG = 'ed25519';
/** Composants couverts par la signature : la méthode, le nom visé, le chemin et l'empreinte du corps. */
export const SIGNED_FIELDS = ['@method', '@authority', '@path', 'content-digest'];
export const SIGNATURE_PARAMS = ['keyid', 'alg', 'created', 'expires', 'nonce'];
/** `keyid` utilisé à l'enrôlement, quand le hub n'a pas encore d'identifiant : la clé publique est dans le corps. */
export const ENROLL_KEY_ID = 'enroll';
/** Âge maximal d'une signature, et tolérance d'horloge entre le hub et le central (secondes). */
export const SIGNATURE_MAX_AGE_SEC = 300;
export const CLOCK_TOLERANCE_SEC = 60;
/** Bornes de l'intervalle de battement (secondes). */
export const HEARTBEAT_INTERVAL_MIN_SEC = 60;
export const HEARTBEAT_INTERVAL_MAX_SEC = 3600;
export const HEARTBEAT_INTERVAL_DEFAULT_SEC = 300;
/** Demandes (contrat 0.4.0). */
export const TICKET_SCHEMA_V1 = 'velarys.ticket/1';
/** Longueur maximale du message, en caractères, vérifiée par le hub puis par le central après déchiffrement. */
export const TICKET_MESSAGE_MAX_CHARS = 2000;
/** Plafond anti-abus de demandes par hub sur 24 h glissantes. */
export const TICKETS_PER_HUB_PER_DAY = 5;
//# sourceMappingURL=constants.js.map