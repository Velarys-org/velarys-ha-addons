import { type KeyObject } from 'node:crypto';
export interface OutgoingRequest {
    method: string;
    url: string;
    /** Corps JSON déjà sérialisé : c'est exactement cette chaîne qui doit partir sur le réseau. */
    body: string;
}
export interface SignOptions {
    privateKey: KeyObject;
    keyId: string;
    /** Pour les tests uniquement. */
    created?: Date;
    nonce?: string;
}
/**
 * Signe une requête sortante du hub (RFC 9421) et renvoie les en-têtes à envoyer :
 * `content-type`, `content-digest`, `signature-input` et `signature`.
 */
export declare function signRequest(request: OutgoingRequest, options: SignOptions): Promise<Record<string, string>>;
export interface IncomingRequest {
    method: string;
    /** URL telle que reçue, reconstruite avec l'en-tête Host : `@authority` et `@path` en dérivent. */
    url: string;
    headers: Record<string, string | string[] | undefined>;
    /** Corps brut reçu, avant tout parsing JSON. */
    body: string | Uint8Array;
}
export type VerifyFailure = 'missing_signature' | 'bad_digest' | 'unknown_key' | 'expired' | 'invalid_signature';
export type VerifyResult = {
    ok: true;
    keyId: string;
    nonce: string;
    created: Date;
} | {
    ok: false;
    reason: VerifyFailure;
    detail?: string;
};
export interface VerifyOptions {
    /** Retrouve la clé publique d'un `keyid`, ou `null` s'il est inconnu. */
    resolveKey: (keyId: string) => Promise<KeyObject | null> | KeyObject | null;
}
/**
 * Vérifie une requête entrante signée par un hub. Exige une seule signature, couvrant
 * `@method`, `@authority`, `@path` et `content-digest`, avec `created`, `nonce` et `keyid`.
 * L'anti-rejeu (nonce déjà vu) reste à la charge de l'appelant, qui tient le registre.
 */
export declare function verifyRequest(request: IncomingRequest, options: VerifyOptions): Promise<VerifyResult>;
