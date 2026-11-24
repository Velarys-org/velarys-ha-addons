/** Version du contrat, recopiée dans l'add-on avec le package vendorisé. */
export declare const HUB_API_VERSION = "0.5.0";
/** Routes publiques, les seules que le tunnel Cloudflare publie (préfixe `/v1/hub/`). */
export declare const HUB_PATHS: {
    readonly enroll: '/v1/hub/enroll';
    readonly heartbeat: '/v1/hub/heartbeat';
    readonly health: '/v1/hub/health';
    /** Demandes du hub (contrat 0.4.0) : création, liste des statuts, clé de scellement du central. */
    readonly tickets: '/v1/hub/tickets';
    readonly ticketList: '/v1/hub/tickets/list';
    readonly sealKey: '/v1/hub/seal-key';
    /** Fil d'une demande (contrat 0.5.0) : message du client, passkeys de signature des réponses. */
    readonly ticketMessages: '/v1/hub/tickets/messages';
    readonly replyKeys: '/v1/hub/reply-keys';
};
/** Schémas de battement que le central accepte. Le central fait autorité : il en ajoute, il en retire. */
export declare const HEARTBEAT_SCHEMA_V1 = "velarys.heartbeat/1";
export declare const SUPPORTED_HEARTBEAT_SCHEMAS: readonly ["velarys.heartbeat/1"];
/** Signature des requêtes (RFC 9421). */
export declare const SIGNATURE_LABEL = "velarys";
export declare const SIGNATURE_ALG = "ed25519";
/** Composants couverts par la signature : la méthode, le nom visé, le chemin et l'empreinte du corps. */
export declare const SIGNED_FIELDS: readonly ['@method', '@authority', '@path', 'content-digest'];
export declare const SIGNATURE_PARAMS: readonly ['keyid', 'alg', 'created', 'expires', 'nonce'];
/** `keyid` utilisé à l'enrôlement, quand le hub n'a pas encore d'identifiant : la clé publique est dans le corps. */
export declare const ENROLL_KEY_ID = "enroll";
/** Âge maximal d'une signature, et tolérance d'horloge entre le hub et le central (secondes). */
export declare const SIGNATURE_MAX_AGE_SEC = 300;
export declare const CLOCK_TOLERANCE_SEC = 60;
/** Bornes de l'intervalle de battement (secondes). */
export declare const HEARTBEAT_INTERVAL_MIN_SEC = 60;
export declare const HEARTBEAT_INTERVAL_MAX_SEC = 3600;
export declare const HEARTBEAT_INTERVAL_DEFAULT_SEC = 300;
/** Demandes (contrat 0.4.0). */
export declare const TICKET_SCHEMA_V1 = "velarys.ticket/1";
/** Longueur maximale du message, en caractères, vérifiée par le hub puis par le central après déchiffrement. */
export declare const TICKET_MESSAGE_MAX_CHARS = 2000;
/** Plafond anti-abus de demandes par hub sur 24 h glissantes. */
export declare const TICKETS_PER_HUB_PER_DAY = 5;
/** Message ajouté par le client au fil d'une demande (contrat 0.5.0). */
export declare const TICKET_MESSAGE_SCHEMA_V1 = "velarys.ticket-message/1";
/** Plafond anti-abus de messages ajoutés par hub sur 24 h glissantes (premières demandes non comprises). */
export declare const TICKET_MESSAGES_PER_HUB_PER_DAY = 20;
/**
 * Messages types de Velarys : le central n'envoie que le code, le hub affiche son propre texte.
 * Liste fermée, sans signature (même niveau de confiance que les statuts). Ajouter un code = le
 * traduire dans le panneau de l'add-on, et le publier avant que l'admin ne l'envoie.
 */
export declare const REPLY_TEMPLATES: readonly ['received', 'need_details', 'checking', 'will_call', 'visit_needed', 'fixed', 'quote_coming', 'not_possible'];
export type ReplyTemplate = (typeof REPLY_TEMPLATES)[number];
