import { createHash } from 'node:crypto';
import { Aes128Gcm, CipherSuite, DhkemX25519HkdfSha256, HkdfSha256 } from '@hpke/core';
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
export const SEAL_ALG = 'hpke-x25519-hkdfsha256-aes128gcm';
/** `info` HPKE : lie le chiffré à son usage, une enveloppe de demande ne vaut rien ailleurs. */
const SEAL_INFO = new TextEncoder().encode('velarys.ticket/1');
const suite = new CipherSuite({ kem: new DhkemX25519HkdfSha256(), kdf: new HkdfSha256(), aead: new Aes128Gcm() });
/** Clés publiques de scellement épinglées, par URL de central. Une rotation = une version de l'add-on. */
export const PINNED_SEAL_KEYS = {
    // Vide tant que la paire de production n'est pas générée sur le NAS (`yarn seal-key`) : l'add-on
    // refuse alors d'envoyer une demande au central de production plutôt que de lire une clé non épinglée.
    'https://hub.velarys.fr': [],
};
const b64u = (bytes) => Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString('base64url');
const fromB64u = (text) => new Uint8Array(Buffer.from(text, 'base64url'));
/** Identifiant de clé : 16 caractères base64url de l'empreinte SHA-256 de la clé publique. */
export function sealKeyId(publicKey) {
    return createHash('sha256').update(fromB64u(publicKey)).digest('base64url').slice(0, 16);
}
/** Données associées : le chiffré est lié au hub et au type de demande. */
function sealAad(hubId, kind) {
    return new TextEncoder().encode(`${hubId}:${kind}`);
}
/** Paire de scellement neuve (outil de génération du central, tests). */
export async function generateSealKeyPair() {
    const pair = await suite.kem.generateKeyPair();
    const publicKey = b64u(await suite.kem.serializePublicKey(pair.publicKey));
    return {
        privateKey: b64u(await suite.kem.serializePrivateKey(pair.privateKey)),
        publicKey: { kid: sealKeyId(publicKey), publicKey },
    };
}
/** Clé publique d'une clé privée de scellement (base64url) : le central la publie et vérifie l'épinglage. */
export async function sealPublicKeyFromPrivate(privateKey) {
    const raw = fromB64u(privateKey);
    if (raw.length !== 32)
        throw new Error('La clé privée de scellement doit faire 32 octets (X25519 brute, base64url)');
    const sk = await suite.kem.deserializePrivateKey(raw);
    const jwk = await crypto.subtle.exportKey('jwk', sk);
    if (typeof jwk.x !== 'string')
        throw new Error('Clé privée de scellement illisible');
    return { kid: sealKeyId(jwk.x), publicKey: jwk.x };
}
export async function sealText(recipient, text, hubId, kind) {
    const recipientPublicKey = await suite.kem.deserializePublicKey(fromB64u(recipient.publicKey));
    const { ct, enc } = await suite.seal({ recipientPublicKey, info: SEAL_INFO }, new TextEncoder().encode(text), sealAad(hubId, kind));
    return { kid: recipient.kid, enc: b64u(enc), ct: b64u(ct) };
}
/** Ouvre une enveloppe ; lève une erreur si la clé, le hub, le type ou le chiffré ne correspondent pas. */
export async function openSealedText(privateKey, sealed, hubId, kind) {
    const recipientKey = await suite.kem.deserializePrivateKey(fromB64u(privateKey));
    const pt = await suite.open({ recipientKey, enc: fromB64u(sealed.enc), info: SEAL_INFO }, fromB64u(sealed.ct), sealAad(hubId, kind));
    return new TextDecoder('utf-8', { fatal: true }).decode(pt);
}
//# sourceMappingURL=seal.js.map