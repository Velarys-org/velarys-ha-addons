import Type from 'typebox';
import { HEARTBEAT_INTERVAL_MAX_SEC, HEARTBEAT_INTERVAL_MIN_SEC, HEARTBEAT_SCHEMA_V1, TICKET_SCHEMA_V1, } from './constants.js';
import { SEAL_ALG } from './seal.js';
/** Clé publique Ed25519 du hub, au format JWK (RFC 8037). */
export const Ed25519PublicJwk = Type.Object({
    kty: Type.Literal('OKP'),
    crv: Type.Literal('Ed25519'),
    x: Type.String({ minLength: 43, maxLength: 43, pattern: '^[A-Za-z0-9_-]+$' }),
}, { additionalProperties: false });
const Version = Type.String({ maxLength: 64 });
const NullableVersion = Type.Union([Version, Type.Null()]);
/** Code d'enrôlement tel que saisi : lettres et chiffres, tirets et espaces tolérés. */
export const EnrollmentCode = Type.String({ minLength: 8, maxLength: 64 });
export const EnrollRequest = Type.Object({
    code: EnrollmentCode,
    publicKeyJwk: Ed25519PublicJwk,
    hub: Type.Object({
        name: Type.String({ minLength: 1, maxLength: 128 }),
        arch: Type.String({ maxLength: 32 }),
        haVersion: NullableVersion,
        osVersion: NullableVersion,
        agentVersion: Version,
    }, { additionalProperties: false }),
}, { additionalProperties: false });
export const EnrollResponse = Type.Object({
    hubId: Type.String(),
    heartbeatIntervalSec: Type.Integer(),
});
/**
 * Identifiant technique (domaine d'intégration, slug d'add-on, clé de réparation, raison du
 * Supervisor) : minuscules, chiffres, `_ . -`. Jamais de texte libre, où traîneraient des noms de
 * personnes, d'appareils ou d'emplacements.
 */
const Code = Type.String({ minLength: 1, maxLength: 64, pattern: '^[a-z0-9_.-]+$' });
const NullableDate = Type.Union([Type.String({ format: 'date-time' }), Type.Null()]);
const strict = { additionalProperties: false };
/** Mise à jour disponible d'un composant suivi par le Supervisor. */
export const HealthUpdate = Type.Object({
    component: Type.Union([Type.Literal('core'), Type.Literal('os'), Type.Literal('supervisor'), Type.Literal('addon')]),
    /** Slug de l'add-on, pour `addon` seulement. */
    slug: Type.Optional(Code),
    version: Version,
    latest: Version,
}, strict);
/** États d'une intégration en échec ; une intégration chargée ne remonte pas. */
export const IntegrationFailure = Type.Union([
    Type.Literal('setup_error'),
    Type.Literal('setup_retry'),
    Type.Literal('migration_error'),
    Type.Literal('failed_unload'),
]);
/**
 * Résumé de santé du hub (contrat 0.3.0). Des codes, des versions, des dates et des comptes : jamais
 * de titre d'intégration, d'`entity_id`, de nom d'appareil, d'emplacement de sauvegarde ni de
 * journal. L'add-on rapporte, le central juge : aucun seuil ici.
 *
 * Chaque sous-bloc vaut `null` quand sa lecture a échoué, et `probeErrors` dit lesquelles : le
 * central distingue « inconnu » de « tout va bien ».
 */
export const HealthV1 = Type.Object({
    collectedAt: Type.String({ format: 'date-time' }),
    updates: Type.Union([
        Type.Object({
            items: Type.Array(HealthUpdate, { maxItems: 64 }),
            /** Autres mises à jour disponibles (HACS, firmwares Zigbee…) : un compte seulement. */
            otherCount: Type.Integer({ minimum: 0 }),
        }, strict),
        Type.Null(),
    ]),
    backup: Type.Union([
        Type.Object({
            /** Dernière sauvegarde automatique réussie. */
            lastSuccessAt: NullableDate,
            /** Dernière tentative de sauvegarde automatique, réussie ou non. */
            lastAttemptAt: NullableDate,
            /** La dernière tentative a échoué. */
            lastAttemptFailed: Type.Union([Type.Boolean(), Type.Null()]),
            /** Au moins une destination hors du hub (cloud, NAS…), sans dire laquelle. */
            offHubCopy: Type.Union([Type.Boolean(), Type.Null()]),
        }, strict),
        Type.Null(),
    ]),
    disk: Type.Union([
        Type.Object({ totalGb: Type.Number({ minimum: 0 }), freeGb: Type.Number({ minimum: 0 }) }, strict),
        Type.Null(),
    ]),
    integrations: Type.Union([
        Type.Array(Type.Object({ domain: Code, state: IntegrationFailure }, strict), { maxItems: 64 }),
        Type.Null(),
    ]),
    /** Réparations signalées par HA, hors Spook et hors liste « génériques » de l'add-on. */
    repairs: Type.Union([
        Type.Array(Type.Object({
            domain: Code,
            /** `translation_key` de la réparation, jamais son `issue_id` (qui peut citer une entité). */
            key: Code,
            severity: Type.Union([Type.Literal('critical'), Type.Literal('error'), Type.Literal('warning')]),
        }, strict), { maxItems: 64 }),
        Type.Null(),
    ]),
    /** Centre de résolution du Supervisor : raisons d'« unhealthy » et d'« unsupported ». */
    system: Type.Union([
        Type.Object({ unhealthy: Type.Array(Code, { maxItems: 32 }), unsupported: Type.Array(Code, { maxItems: 32 }) }, strict),
        Type.Null(),
    ]),
    probeErrors: Type.Array(Code, { maxItems: 16 }),
}, strict);
/**
 * Battement de cœur, version 1. Uniquement de l'état technique : jamais de présence, de caméra,
 * de serrure ni de calendrier (cadrage du 16/11/2026).
 */
export const HeartbeatV1 = Type.Object({
    schema: Type.Literal(HEARTBEAT_SCHEMA_V1),
    sentAt: Type.String({ format: 'date-time' }),
    agent: Type.Object({ version: Version }, { additionalProperties: false }),
    ha: Type.Object({
        /** `false` = l'API de Home Assistant ne répond pas, alors que l'add-on et le Supervisor tournent. */
        reachable: Type.Boolean(),
        version: NullableVersion,
    }, { additionalProperties: false }),
    supervisor: Type.Object({
        version: NullableVersion,
        healthy: Type.Union([Type.Boolean(), Type.Null()]),
    }, { additionalProperties: false }),
    os: Type.Object({ version: NullableVersion }, { additionalProperties: false }),
    host: Type.Object({ uptimeSec: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]) }, { additionalProperties: false }),
    /**
     * Réglages de l'add-on lui-même, ceux de son onglet Info (contrat 0.2.0). Facultatif : absent =
     * inconnu (agent 0.1.4 et antérieurs) ; `null` = le Supervisor n'a pas répondu.
     */
    addon: Type.Optional(Type.Object({
        /** « Chien de garde » : le Supervisor relance l'add-on s'il s'arrête. */
        watchdog: Type.Union([Type.Boolean(), Type.Null()]),
        /** « Mise à jour automatique » de l'add-on (pas celle de HA ni de l'OS). */
        autoUpdate: Type.Union([Type.Boolean(), Type.Null()]),
        /** « Lancer au démarrage » : `auto` = l'add-on repart avec la machine. */
        boot: Type.Union([Type.Literal('auto'), Type.Literal('manual'), Type.Null()]),
    }, { additionalProperties: false })),
    /**
     * Résumé de santé (contrat 0.3.0). Facultatif : absent = agent antérieur, ou relevé pas encore
     * fait depuis le démarrage.
     */
    health: Type.Optional(HealthV1),
}, { additionalProperties: false });
export const HeartbeatResponse = Type.Object({
    accepted: Type.Literal(true),
    nextIntervalSec: Type.Integer({
        minimum: HEARTBEAT_INTERVAL_MIN_SEC,
        maximum: HEARTBEAT_INTERVAL_MAX_SEC,
    }),
});
export const HealthResponse = Type.Object({
    status: Type.Literal('ok'),
    heartbeatSchemas: Type.Array(Type.String()),
});
/**
 * Demandes du hub (contrat 0.4.0) : assistance ou évolution. Le texte libre du client ne circule que
 * scellé pour le central (`seal.ts`) ; rien de libre ne redescend vers le hub, qui ne reçoit que des
 * statuts choisis dans une liste fermée.
 */
export const TicketKind = Type.Union([Type.Literal('assistance'), Type.Literal('evolution')]);
export const TicketStatus = Type.Union([Type.Literal('new'), Type.Literal('in_progress'), Type.Literal('closed')]);
/** Issue d'une demande close : réalisée ou écartée (évolution surtout, une assistance close vaut `done`). */
export const TicketOutcome = Type.Union([Type.Literal('done'), Type.Literal('declined'), Type.Null()]);
const B64u = (min, max) => Type.String({ minLength: min, maxLength: max, pattern: '^[A-Za-z0-9_-]+$' });
export const SealedText = Type.Object({
    kid: B64u(16, 16),
    enc: B64u(43, 43),
    /** 2 000 caractères de 4 octets au pire, plus l'étiquette GCM, en base64url. */
    ct: B64u(22, 10_752),
}, strict);
export const TicketCreateRequest = Type.Object({ schema: Type.Literal(TICKET_SCHEMA_V1), kind: TicketKind, sealed: SealedText }, strict);
/** Ce que le hub sait d'une demande : jamais le texte (il le garde de son côté), jamais de note. */
export const TicketSummary = Type.Object({
    id: Type.String({ format: 'uuid' }),
    kind: TicketKind,
    status: TicketStatus,
    outcome: TicketOutcome,
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
}, strict);
export const TicketCreateResponse = Type.Object({ ticket: TicketSummary }, strict);
/** Corps de la liste : vide, la requête est signée par le hub qui demande les siennes. */
export const TicketListRequest = Type.Object({}, strict);
export const TicketListResponse = Type.Object({ tickets: Type.Array(TicketSummary, { maxItems: 50 }) }, strict);
/** Clé publique de scellement du central. Lue seulement hors production : en production, elle est épinglée. */
export const SealKeyResponse = Type.Object({ alg: Type.Literal(SEAL_ALG), kid: B64u(16, 16), publicKey: B64u(43, 43) }, strict);
/** Erreurs typées : l'add-on agit selon `error`, jamais selon le message. */
export const HubErrorCode = Type.Union([
    Type.Literal('invalid_request'),
    Type.Literal('invalid_signature'),
    Type.Literal('unknown_hub'),
    Type.Literal('revoked'),
    Type.Literal('replayed'),
    Type.Literal('code_invalid'),
    Type.Literal('code_used'),
    Type.Literal('code_expired'),
    Type.Literal('key_already_enrolled'),
    Type.Literal('unsupported_schema'),
    // Demandes (contrat 0.4.0)
    Type.Literal('tickets_disabled'),
    Type.Literal('unknown_seal_key'),
    Type.Literal('undecryptable'),
    Type.Literal('message_too_long'),
    Type.Literal('rate_limited'),
]);
export const HubError = Type.Object({
    error: HubErrorCode,
    message: Type.String(),
});
//# sourceMappingURL=schemas.js.map