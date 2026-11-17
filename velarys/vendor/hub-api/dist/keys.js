import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
export function generateHubKeyPair() {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    return {
        privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
        publicKeyJwk: exportPublicJwk(publicKey),
    };
}
export function exportPublicJwk(publicKey) {
    const jwk = publicKey.export({ format: 'jwk' });
    if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string') {
        throw new Error('La clé publique n’est pas une clé Ed25519');
    }
    return { kty: 'OKP', crv: 'Ed25519', x: jwk.x };
}
export function privateKeyFromPem(pem) {
    const key = createPrivateKey(pem);
    if (key.asymmetricKeyType !== 'ed25519')
        throw new Error('La clé privée n’est pas une clé Ed25519');
    return key;
}
export function publicKeyFromJwk(jwk) {
    return createPublicKey({ key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x }, format: 'jwk' });
}
export function publicJwkFromPrivate(privateKey) {
    return exportPublicJwk(createPublicKey(privateKey));
}
//# sourceMappingURL=keys.js.map