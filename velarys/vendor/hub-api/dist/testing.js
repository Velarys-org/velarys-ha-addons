/**
 * Outils de test du contrat (point d'entrée `@velarys/hub-api/testing`, jamais importé par le code de
 * production) : un authentificateur WebAuthn logiciel, pour le central et l'add-on.
 */
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { hashForPin, replyChallenge } from './reply-signature.js';
/**
 * Authentificateur WebAuthn logiciel, pour les tests : produit exactement ce que renvoie
 * `navigator.credentials.get()` (authenticatorData, clientDataJSON, signature DER ES256).
 */
export class FakeAuthenticator {
    rpId;
    origin;
    credentialId = randomBytes(16).toString('base64url');
    keys = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    counter = 0;
    constructor(rpId = 'admin.velarys.test', origin = 'https://admin.velarys.test') {
        this.rpId = rpId;
        this.origin = origin;
    }
    get replyKey() {
        return {
            credentialId: this.credentialId,
            alg: -7,
            publicKey: this.keys.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url'),
            rpIdHash: hashForPin(this.rpId),
            originHash: hashForPin(this.origin),
        };
    }
    sign(statement, opts = {}) {
        const clientDataJSON = Buffer.from(JSON.stringify({
            type: opts.type ?? 'webauthn.get',
            challenge: opts.challenge ?? replyChallenge(statement),
            origin: opts.origin ?? this.origin,
            crossOrigin: false,
        }));
        const counter = Buffer.alloc(4);
        counter.writeUInt32BE(++this.counter);
        const authenticatorData = Buffer.concat([
            createHash('sha256').update(opts.rpId ?? this.rpId).digest(),
            Buffer.from([opts.flags ?? 0x05]),
            counter,
        ]);
        const signature = sign('sha256', Buffer.concat([authenticatorData, createHash('sha256').update(clientDataJSON).digest()]), {
            key: this.keys.privateKey,
            dsaEncoding: 'der',
        });
        return {
            statement,
            assertion: {
                credentialId: this.credentialId,
                authenticatorData: authenticatorData.toString('base64url'),
                clientDataJSON: clientDataJSON.toString('base64url'),
                signature: signature.toString('base64url'),
            },
        };
    }
}
//# sourceMappingURL=testing.js.map