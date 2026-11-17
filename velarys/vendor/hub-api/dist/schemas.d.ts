import Type from 'typebox';
/** Clé publique Ed25519 du hub, au format JWK (RFC 8037). */
export declare const Ed25519PublicJwk: Type.TObject<{
    kty: Type.TLiteral<"OKP">;
    crv: Type.TLiteral<"Ed25519">;
    x: Type.TString;
}>;
export type Ed25519PublicJwk = Type.Static<typeof Ed25519PublicJwk>;
/** Code d'enrôlement tel que saisi : lettres et chiffres, tirets et espaces tolérés. */
export declare const EnrollmentCode: Type.TString;
export declare const EnrollRequest: Type.TObject<{
    code: Type.TString;
    publicKeyJwk: Type.TObject<{
        kty: Type.TLiteral<"OKP">;
        crv: Type.TLiteral<"Ed25519">;
        x: Type.TString;
    }>;
    hub: Type.TObject<{
        name: Type.TString;
        arch: Type.TString;
        haVersion: Type.TUnion<[Type.TString, Type.TNull]>;
        osVersion: Type.TUnion<[Type.TString, Type.TNull]>;
        agentVersion: Type.TString;
    }>;
}>;
export type EnrollRequest = Type.Static<typeof EnrollRequest>;
export declare const EnrollResponse: Type.TObject<{
    hubId: Type.TString;
    heartbeatIntervalSec: Type.TInteger;
}>;
export type EnrollResponse = Type.Static<typeof EnrollResponse>;
/**
 * Battement de cœur, version 1. Uniquement de l'état technique : jamais de présence, de caméra,
 * de serrure ni de calendrier (cadrage du 16/11/2026).
 */
export declare const HeartbeatV1: Type.TObject<{
    schema: Type.TLiteral<"velarys.heartbeat/1">;
    sentAt: Type.TString;
    agent: Type.TObject<{
        version: Type.TString;
    }>;
    ha: Type.TObject<{
        /** `false` = l'API de Home Assistant ne répond pas, alors que l'add-on et le Supervisor tournent. */
        reachable: Type.TBoolean;
        version: Type.TUnion<[Type.TString, Type.TNull]>;
    }>;
    supervisor: Type.TObject<{
        version: Type.TUnion<[Type.TString, Type.TNull]>;
        healthy: Type.TUnion<[Type.TBoolean, Type.TNull]>;
    }>;
    os: Type.TObject<{
        version: Type.TUnion<[Type.TString, Type.TNull]>;
    }>;
    host: Type.TObject<{
        uptimeSec: Type.TUnion<[Type.TInteger, Type.TNull]>;
    }>;
}>;
export type HeartbeatV1 = Type.Static<typeof HeartbeatV1>;
export declare const HeartbeatResponse: Type.TObject<{
    accepted: Type.TLiteral<true>;
    nextIntervalSec: Type.TInteger;
}>;
export type HeartbeatResponse = Type.Static<typeof HeartbeatResponse>;
export declare const HealthResponse: Type.TObject<{
    status: Type.TLiteral<"ok">;
    heartbeatSchemas: Type.TArray<Type.TString>;
}>;
export type HealthResponse = Type.Static<typeof HealthResponse>;
/** Erreurs typées : l'add-on agit selon `error`, jamais selon le message. */
export declare const HubErrorCode: Type.TUnion<[Type.TLiteral<"invalid_request">, Type.TLiteral<"invalid_signature">, Type.TLiteral<"unknown_hub">, Type.TLiteral<"revoked">, Type.TLiteral<"replayed">, Type.TLiteral<"code_invalid">, Type.TLiteral<"code_used">, Type.TLiteral<"code_expired">, Type.TLiteral<"key_already_enrolled">, Type.TLiteral<"unsupported_schema">]>;
export type HubErrorCode = Type.Static<typeof HubErrorCode>;
export declare const HubError: Type.TObject<{
    error: Type.TUnion<[Type.TLiteral<"invalid_request">, Type.TLiteral<"invalid_signature">, Type.TLiteral<"unknown_hub">, Type.TLiteral<"revoked">, Type.TLiteral<"replayed">, Type.TLiteral<"code_invalid">, Type.TLiteral<"code_used">, Type.TLiteral<"code_expired">, Type.TLiteral<"key_already_enrolled">, Type.TLiteral<"unsupported_schema">]>;
    message: Type.TString;
}>;
export type HubError = Type.Static<typeof HubError>;
