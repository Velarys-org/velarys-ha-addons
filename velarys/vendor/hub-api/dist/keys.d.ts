import { type KeyObject } from 'node:crypto';
import type { Ed25519PublicJwk } from './schemas.js';
export interface HubKeyPair {
    /** Clé privée PKCS#8 en PEM : elle ne quitte jamais le hub. */
    privateKeyPem: string;
    publicKeyJwk: Ed25519PublicJwk;
}
export declare function generateHubKeyPair(): HubKeyPair;
export declare function exportPublicJwk(publicKey: KeyObject): Ed25519PublicJwk;
export declare function privateKeyFromPem(pem: string): KeyObject;
export declare function publicKeyFromJwk(jwk: Ed25519PublicJwk): KeyObject;
export declare function publicJwkFromPrivate(privateKey: KeyObject): Ed25519PublicJwk;
