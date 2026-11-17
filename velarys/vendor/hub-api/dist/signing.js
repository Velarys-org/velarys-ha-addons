import { randomBytes } from 'node:crypto';
import { createSigner, createVerifier, ExpiredError, httpbis, UnknownKeyError, } from 'http-message-signatures';
import { CLOCK_TOLERANCE_SEC, SIGNATURE_ALG, SIGNATURE_LABEL, SIGNATURE_MAX_AGE_SEC, SIGNATURE_PARAMS, SIGNED_FIELDS, } from './constants.js';
import { contentDigest, verifyContentDigest } from './digest.js';
/**
 * Signe une requête sortante du hub (RFC 9421) et renvoie les en-têtes à envoyer :
 * `content-type`, `content-digest`, `signature-input` et `signature`.
 */
export async function signRequest(request, options) {
    const headers = {
        'content-type': 'application/json',
        'content-digest': contentDigest(request.body),
    };
    const paramValues = {
        nonce: options.nonce ?? randomBytes(16).toString('base64url'),
    };
    if (options.created) {
        paramValues.created = options.created;
        paramValues.expires = new Date(options.created.getTime() + SIGNATURE_MAX_AGE_SEC * 1000);
    }
    const signed = await httpbis.signMessage({
        key: createSigner(options.privateKey, SIGNATURE_ALG, options.keyId),
        name: SIGNATURE_LABEL,
        fields: [...SIGNED_FIELDS],
        params: [...SIGNATURE_PARAMS],
        paramValues,
    }, { method: request.method.toUpperCase(), url: request.url, headers });
    const out = {};
    for (const [name, value] of Object.entries(signed.headers)) {
        out[name.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
    }
    return out;
}
/**
 * Vérifie une requête entrante signée par un hub. Exige une seule signature, couvrant
 * `@method`, `@authority`, `@path` et `content-digest`, avec `created`, `nonce` et `keyid`.
 * L'anti-rejeu (nonce déjà vu) reste à la charge de l'appelant, qui tient le registre.
 */
export async function verifyRequest(request, options) {
    const headers = {};
    for (const [name, value] of Object.entries(request.headers)) {
        if (value !== undefined)
            headers[name.toLowerCase()] = value;
    }
    if (!headers['signature'] || !headers['signature-input']) {
        return { ok: false, reason: 'missing_signature' };
    }
    const digestHeader = headers['content-digest'];
    if (!verifyContentDigest(Array.isArray(digestHeader) ? digestHeader.join(', ') : digestHeader, request.body)) {
        return { ok: false, reason: 'bad_digest' };
    }
    const lookups = [];
    let verified;
    try {
        verified = await httpbis.verifyMessage({
            all: true,
            maxAge: SIGNATURE_MAX_AGE_SEC,
            tolerance: CLOCK_TOLERANCE_SEC,
            requiredParams: ['keyid', 'alg', 'created', 'nonce'],
            requiredFields: [...SIGNED_FIELDS],
            async keyLookup(params) {
                lookups.push(params);
                if (params.alg !== SIGNATURE_ALG || typeof params.keyid !== 'string')
                    return null;
                const key = await options.resolveKey(params.keyid);
                if (!key)
                    return null;
                return { id: params.keyid, algs: [SIGNATURE_ALG], verify: createVerifier(key, SIGNATURE_ALG) };
            },
        }, { method: request.method.toUpperCase(), url: request.url, headers });
    }
    catch (error) {
        if (error instanceof UnknownKeyError)
            return { ok: false, reason: 'unknown_key' };
        if (error instanceof ExpiredError)
            return { ok: false, reason: 'expired', detail: error.message };
        return { ok: false, reason: 'invalid_signature', detail: error.message };
    }
    // Une seule signature : sinon on ne saurait pas quel `keyid` a réellement prouvé la requête.
    const [params] = lookups;
    if (lookups.length !== 1 || !params) {
        return { ok: false, reason: 'invalid_signature', detail: 'exactly one signature is required' };
    }
    if (verified !== true)
        return { ok: false, reason: 'invalid_signature' };
    const { keyid, nonce, created } = params;
    if (typeof keyid !== 'string' || typeof nonce !== 'string' || !(created instanceof Date)) {
        return { ok: false, reason: 'invalid_signature', detail: 'missing keyid, nonce or created' };
    }
    return { ok: true, keyId: keyid, nonce, created };
}
//# sourceMappingURL=signing.js.map