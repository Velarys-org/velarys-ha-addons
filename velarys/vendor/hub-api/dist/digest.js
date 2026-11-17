import { createHash, timingSafeEqual } from 'node:crypto';
/** Empreinte du corps au format `Content-Digest` (RFC 9530), algorithme sha-256. */
export function contentDigest(body) {
    const hash = createHash('sha256').update(body).digest('base64');
    return `sha-256=:${hash}:`;
}
/**
 * Vérifie qu'un en-tête `Content-Digest` contient une empreinte sha-256 conforme au corps reçu.
 * Les autres algorithmes éventuellement présents sont ignorés : seul sha-256 fait foi.
 */
export function verifyContentDigest(header, body) {
    if (!header)
        return false;
    const match = /(?:^|,)\s*sha-256=:([A-Za-z0-9+/=]+):\s*(?:,|$)/.exec(header);
    if (!match?.[1])
        return false;
    const expected = createHash('sha256').update(body).digest();
    const received = Buffer.from(match[1], 'base64');
    return received.length === expected.length && timingSafeEqual(received, expected);
}
//# sourceMappingURL=digest.js.map