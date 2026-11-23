/** Version du contrat, recopiée dans l'add-on avec le package vendorisé. */
export declare const HUB_API_VERSION = "0.3.0";
/** Routes publiques, les seules que le tunnel Cloudflare publie (préfixe `/v1/hub/`). */
export declare const HUB_PATHS: {
    readonly enroll: '/v1/hub/enroll';
    readonly heartbeat: '/v1/hub/heartbeat';
    readonly health: '/v1/hub/health';
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
