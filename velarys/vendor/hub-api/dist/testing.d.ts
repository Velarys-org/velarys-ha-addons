import { type ReplyKey, type ReplyStatement, type SignedReply } from './reply-signature.js';
/**
 * Authentificateur WebAuthn logiciel, pour les tests : produit exactement ce que renvoie
 * `navigator.credentials.get()` (authenticatorData, clientDataJSON, signature DER ES256).
 */
export declare class FakeAuthenticator {
    readonly rpId: string;
    readonly origin: string;
    readonly credentialId: string;
    private readonly keys;
    private counter;
    constructor(rpId?: string, origin?: string);
    get replyKey(): ReplyKey;
    sign(statement: ReplyStatement, opts?: {
        flags?: number;
        origin?: string;
        type?: string;
        challenge?: string;
        rpId?: string;
    }): SignedReply;
}
