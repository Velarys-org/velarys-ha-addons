import { createHash, createPublicKey, verify } from 'node:crypto';
/** Passkeys de signature épinglées, par URL de central. Vides tant qu'aucune n'est enregistrée. */
export const PINNED_REPLY_KEYS = {
    'https://hub.velarys.fr': [
        // Passkey de signature de production, créée le 2026-11-24.
        { credentialId: '-NevH_OIRmOG6jvTs6D8IA', alg: -7, publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEhR1lXawlyt4seIDgFSBEsqlQdDLUWYWAfr9mS3VMJ-SIlplWjOmxe73b5WXbQEIuEs6gTV_3zsLhXxNlbB0XNQ', rpIdHash: 'SI_q2xU1aAqIvAfuFCXIe4z9KkunE4f0oqpsmlTN0RE', originHash: 'SBVEukZUORKU0xhsVZcY3qftzgZmpgcboM1LY3roUmA' },
    ],
};
const sha256 = (data) => createHash('sha256').update(data).digest();
const b64u = (data) => Buffer.from(data).toString('base64url');
/** Forme canonique : clés dans un ordre fixe, pour que l'admin et le hub hachent les mêmes octets. */
export function canonicalStatement(s) {
    return JSON.stringify({ v: s.v, hubId: s.hubId, ticketId: s.ticketId, messageId: s.messageId, createdAt: s.createdAt, text: s.text });
}
/** `challenge` WebAuthn d'une déclaration : SHA-256 de sa forme canonique, en base64url. */
export function replyChallenge(s) {
    return b64u(sha256(canonicalStatement(s)));
}
export const hashForPin = (value) => b64u(sha256(value));
/**
 * Vérifie une réponse signée pour un destinataire donné. `expected` vient du hub lui-même (son
 * identifiant, la demande et le message où la réponse est rangée) : une signature valide pour un
 * autre hub, une autre demande ou un autre message est refusée.
 */
export function verifySignedReply(reply, keys, expected) {
    const { statement, assertion } = reply;
    if (statement.v !== 1 || typeof statement.text !== 'string')
        return { ok: false, reason: 'bad_client_data' };
    if (statement.hubId !== expected.hubId || statement.ticketId !== expected.ticketId || statement.messageId !== expected.messageId) {
        return { ok: false, reason: 'wrong_target' };
    }
    const key = keys.find((k) => k.credentialId === assertion.credentialId);
    if (!key)
        return { ok: false, reason: 'unknown_key' };
    const clientDataBytes = Buffer.from(assertion.clientDataJSON, 'base64url');
    let clientData;
    try {
        clientData = JSON.parse(clientDataBytes.toString('utf8'));
    }
    catch {
        return { ok: false, reason: 'bad_client_data' };
    }
    if (clientData.type !== 'webauthn.get' || clientData.crossOrigin === true)
        return { ok: false, reason: 'bad_client_data' };
    if (clientData.challenge !== replyChallenge(statement))
        return { ok: false, reason: 'wrong_challenge' };
    if (typeof clientData.origin !== 'string' || hashForPin(clientData.origin) !== key.originHash) {
        return { ok: false, reason: 'wrong_origin' };
    }
    const authData = Buffer.from(assertion.authenticatorData, 'base64url');
    if (authData.length < 37)
        return { ok: false, reason: 'bad_client_data' };
    if (b64u(authData.subarray(0, 32)) !== key.rpIdHash)
        return { ok: false, reason: 'wrong_rp' };
    const flags = authData[32];
    // UP (présence, bit 0) et UV (vérification : biométrie ou code, bit 2) exigés.
    if ((flags & 0x01) === 0 || (flags & 0x04) === 0)
        return { ok: false, reason: 'no_user_verification' };
    const signed = Buffer.concat([authData, sha256(clientDataBytes)]);
    const publicKey = createPublicKey({ key: Buffer.from(key.publicKey, 'base64url'), format: 'der', type: 'spki' });
    const signature = Buffer.from(assertion.signature, 'base64url');
    let valid = false;
    try {
        valid =
            key.alg === -7
                ? verify('sha256', signed, { key: publicKey, dsaEncoding: 'der' }, signature)
                : verify(null, signed, publicKey, signature);
    }
    catch {
        valid = false;
    }
    if (!valid)
        return { ok: false, reason: 'bad_signature' };
    return { ok: true, text: statement.text, key };
}
//# sourceMappingURL=reply-signature.js.map