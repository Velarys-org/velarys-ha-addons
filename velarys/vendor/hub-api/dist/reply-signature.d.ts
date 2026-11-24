/**
 * Réponses de Velarys signées par passkey (contrat 0.5.0).
 *
 * Le central ne peut rien écrire de libre chez un client : une réponse en texte libre n'est affichée
 * par le hub que si elle porte une signature WebAuthn de la passkey de Velarys, dont la clé publique
 * est **épinglée dans l'add-on** (`PINNED_REPLY_KEYS`). Un central compromis ne peut donc pas écrire
 * à volonté à toute la flotte : chaque message exige un geste de la personne qui tient la passkey, et
 * la signature ne vaut que pour un hub, une demande et un message.
 *
 * Ce qui est signé : l'empreinte SHA-256 de la déclaration canonique (`canonicalStatement`), passée
 * comme `challenge` à `navigator.credentials.get()`. La vérification suit WebAuthn niveau 2 (§7.2) :
 * type `webauthn.get`, challenge, origine, empreinte du rpId, présence et vérification de
 * l'utilisateur, puis signature sur `authenticatorData ‖ SHA-256(clientDataJSON)`.
 *
 * Le nom d'hôte de l'admin n'apparaît nulle part dans ce contrat (vendorisé dans un dépôt public) :
 * seules ses empreintes sont épinglées (`rpIdHash`, `originHash`).
 */
/** Déclaration signée : tout ce que le hub affiche d'une réponse, et à qui elle s'adresse. */
export interface ReplyStatement {
    v: 1;
    hubId: string;
    ticketId: string;
    messageId: string;
    createdAt: string;
    text: string;
}
export interface WebAuthnAssertion {
    credentialId: string;
    /** base64url */
    authenticatorData: string;
    /** base64url des octets exacts de clientDataJSON */
    clientDataJSON: string;
    /** base64url ; DER pour ES256, brute pour EdDSA */
    signature: string;
}
/** Réponse signée, telle qu'elle voyage scellée pour le hub. */
export interface SignedReply {
    statement: ReplyStatement;
    assertion: WebAuthnAssertion;
}
/** Clé publique d'une passkey de signature des réponses. */
export interface ReplyKey {
    credentialId: string;
    /** COSE : -7 = ES256 (P-256), -8 = EdDSA (Ed25519). */
    alg: -7 | -8;
    /** Clé publique SPKI DER, base64url (`AuthenticatorAttestationResponse.getPublicKey()`). */
    publicKey: string;
    /** SHA-256 du rpId (le nom d'hôte de l'admin), base64url. */
    rpIdHash: string;
    /** SHA-256 de l'origine de l'admin (`https://…`), base64url. */
    originHash: string;
}
/** Passkeys de signature épinglées, par URL de central. Vides tant qu'aucune n'est enregistrée. */
export declare const PINNED_REPLY_KEYS: Readonly<Record<string, readonly ReplyKey[]>>;
/** Forme canonique : clés dans un ordre fixe, pour que l'admin et le hub hachent les mêmes octets. */
export declare function canonicalStatement(s: ReplyStatement): string;
/** `challenge` WebAuthn d'une déclaration : SHA-256 de sa forme canonique, en base64url. */
export declare function replyChallenge(s: ReplyStatement): string;
export declare const hashForPin: (value: string) => string;
export type ReplyVerifyFailure = 'unknown_key' | 'bad_client_data' | 'wrong_challenge' | 'wrong_origin' | 'wrong_rp' | 'no_user_verification' | 'bad_signature' | 'wrong_target';
export type ReplyVerifyResult = {
    ok: true;
    text: string;
    key: ReplyKey;
} | {
    ok: false;
    reason: ReplyVerifyFailure;
};
/**
 * Vérifie une réponse signée pour un destinataire donné. `expected` vient du hub lui-même (son
 * identifiant, la demande et le message où la réponse est rangée) : une signature valide pour un
 * autre hub, une autre demande ou un autre message est refusée.
 */
export declare function verifySignedReply(reply: SignedReply, keys: readonly ReplyKey[], expected: {
    hubId: string;
    ticketId: string;
    messageId: string;
}): ReplyVerifyResult;
