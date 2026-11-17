import Type from 'typebox';
import { HEARTBEAT_INTERVAL_MAX_SEC, HEARTBEAT_INTERVAL_MIN_SEC, HEARTBEAT_SCHEMA_V1, } from './constants.js';
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
]);
export const HubError = Type.Object({
    error: HubErrorCode,
    message: Type.String(),
});
//# sourceMappingURL=schemas.js.map