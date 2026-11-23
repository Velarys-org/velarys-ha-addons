/**
 * Chiffrement du texte libre d'une demande (usecase « demande d'assistance », exigence du
 * 19/11/2026) : le hub scelle le message pour le central avant de signer la requête, si bien que
 * Cloudflare, qui termine le TLS du tunnel, ne voit qu'une enveloppe. HPKE de la RFC 9180 en mode
 * Base (X25519, HKDF-SHA256, AES-128-GCM), par @hpke/core : pas de cryptographie maison.
 *
 * Cette paire de clés est **propre au central** (il doit déchiffrer), distincte de la future clé de
 * signature Velarys hors ligne. Le central garde la privée ; la publique est épinglée dans l'add-on
 * pour le central de production (`PINNED_SEAL_KEYS`), parce qu'une clé lue à travers le tunnel
 * pourrait être remplacée par celui-là même dont on veut se cacher.
 */
export declare const SEAL_ALG = "hpke-x25519-hkdfsha256-aes128gcm";
/** Clés publiques de scellement épinglées, par URL de central. Une rotation = une version de l'add-on. */
export declare const PINNED_SEAL_KEYS: Readonly<Record<string, readonly SealPublicKey[]>>;
export interface SealPublicKey {
    /** Identifiant court de la clé, dérivé de la clé publique. */
    kid: string;
    /** Clé publique X25519 brute (32 octets), en base64url. */
    publicKey: string;
}
export interface SealedEnvelope {
    kid: string;
    /** Clé encapsulée HPKE (32 octets), base64url. */
    enc: string;
    /** Chiffré AES-GCM, étiquette comprise, base64url. */
    ct: string;
}
/** Identifiant de clé : 16 caractères base64url de l'empreinte SHA-256 de la clé publique. */
export declare function sealKeyId(publicKey: string): string;
/** Paire de scellement neuve (outil de génération du central, tests). */
export declare function generateSealKeyPair(): Promise<{
    privateKey: string;
    publicKey: SealPublicKey;
}>;
/** Clé publique d'une clé privée de scellement (base64url) : le central la publie et vérifie l'épinglage. */
export declare function sealPublicKeyFromPrivate(privateKey: string): Promise<SealPublicKey>;
export declare function sealText(recipient: SealPublicKey, text: string, hubId: string, kind: string): Promise<SealedEnvelope>;
/** Ouvre une enveloppe ; lève une erreur si la clé, le hub, le type ou le chiffré ne correspondent pas. */
export declare function openSealedText(privateKey: string, sealed: SealedEnvelope, hubId: string, kind: string): Promise<string>;
