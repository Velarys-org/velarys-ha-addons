/** Version du contrat, recopiée dans l'add-on avec le package vendorisé. */
export const HUB_API_VERSION = '0.5.2';
/** Routes publiques, les seules que le tunnel Cloudflare publie (préfixe `/v1/hub/`). */
export const HUB_PATHS = {
    enroll: '/v1/hub/enroll',
    heartbeat: '/v1/hub/heartbeat',
    health: '/v1/hub/health',
    /** Demandes du hub (contrat 0.4.0) : création, liste des statuts, clé de scellement du central. */
    tickets: '/v1/hub/tickets',
    ticketList: '/v1/hub/tickets/list',
    sealKey: '/v1/hub/seal-key',
    /** Fil d'une demande (contrat 0.5.0) : message du client, passkeys de signature des réponses. */
    ticketMessages: '/v1/hub/tickets/messages',
    replyKeys: '/v1/hub/reply-keys',
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
/** Message ajouté par le client au fil d'une demande (contrat 0.5.0). */
export const TICKET_MESSAGE_SCHEMA_V1 = 'velarys.ticket-message/1';
/** Plafond anti-abus de messages ajoutés par hub sur 24 h glissantes (premières demandes non comprises). */
export const TICKET_MESSAGES_PER_HUB_PER_DAY = 20;
/**
 * Archivage des demandes (décision du 2026-11-24) : une demande close et sans mouvement depuis ce
 * délai sort des listes, dans l'admin comme dans le panneau, mais reste consultable dans les
 * archives. Rien n'est effacé. Règle partagée : le hub ne connaît que `status` et `updatedAt`, et
 * `updatedAt` ne bouge plus après la clôture sauf réponse ou réouverture (la note interne n'y touche pas).
 */
export const TICKET_ARCHIVE_AFTER_DAYS = 90;
export function isTicketArchived(ticket, now = new Date()) {
    if (ticket.status !== 'closed')
        return false;
    const updated = typeof ticket.updatedAt === 'string' ? Date.parse(ticket.updatedAt) : ticket.updatedAt.getTime();
    return now.getTime() - updated >= TICKET_ARCHIVE_AFTER_DAYS * 86_400_000;
}
/**
 * Messages types de Velarys : le central n'envoie que le code, le hub affiche son propre texte.
 * Liste fermée, sans signature (même niveau de confiance que les statuts). Ajouter un code = le
 * traduire dans le panneau de l'add-on, et le publier avant que l'admin ne l'envoie.
 */
export const REPLY_TEMPLATES = [
    'received',
    'need_details',
    'checking',
    'will_call',
    'visit_needed',
    'fixed',
    'quote_coming',
    'not_possible',
];
//# sourceMappingURL=constants.js.map