/** Empreinte du corps au format `Content-Digest` (RFC 9530), algorithme sha-256. */
export declare function contentDigest(body: string | Uint8Array): string;
/**
 * Vérifie qu'un en-tête `Content-Digest` contient une empreinte sha-256 conforme au corps reçu.
 * Les autres algorithmes éventuellement présents sont ignorés : seul sha-256 fait foi.
 */
export declare function verifyContentDigest(header: string | undefined, body: string | Uint8Array): boolean;
