import Type from 'typebox';
/** Clé publique Ed25519 du hub, au format JWK (RFC 8037). */
export declare const Ed25519PublicJwk: Type.TObject<{
    kty: Type.TLiteral<"OKP">;
    crv: Type.TLiteral<"Ed25519">;
    x: Type.TString;
}>;
export type Ed25519PublicJwk = Type.Static<typeof Ed25519PublicJwk>;
/** Code d'enrôlement tel que saisi : lettres et chiffres, tirets et espaces tolérés. */
export declare const EnrollmentCode: Type.TString;
export declare const EnrollRequest: Type.TObject<{
    code: Type.TString;
    publicKeyJwk: Type.TObject<{
        kty: Type.TLiteral<"OKP">;
        crv: Type.TLiteral<"Ed25519">;
        x: Type.TString;
    }>;
    hub: Type.TObject<{
        name: Type.TString;
        arch: Type.TString;
        haVersion: Type.TUnion<[Type.TString, Type.TNull]>;
        osVersion: Type.TUnion<[Type.TString, Type.TNull]>;
        agentVersion: Type.TString;
    }>;
}>;
export type EnrollRequest = Type.Static<typeof EnrollRequest>;
export declare const EnrollResponse: Type.TObject<{
    hubId: Type.TString;
    heartbeatIntervalSec: Type.TInteger;
}>;
export type EnrollResponse = Type.Static<typeof EnrollResponse>;
/** Mise à jour disponible d'un composant suivi par le Supervisor. */
export declare const HealthUpdate: Type.TObject<{
    component: Type.TUnion<[Type.TLiteral<"core">, Type.TLiteral<"os">, Type.TLiteral<"supervisor">, Type.TLiteral<"addon">]>;
    /** Slug de l'add-on, pour `addon` seulement. */
    slug: Type.TOptional<Type.TString>;
    version: Type.TString;
    latest: Type.TString;
}>;
export type HealthUpdate = Type.Static<typeof HealthUpdate>;
/** États d'une intégration en échec ; une intégration chargée ne remonte pas. */
export declare const IntegrationFailure: Type.TUnion<[Type.TLiteral<"setup_error">, Type.TLiteral<"setup_retry">, Type.TLiteral<"migration_error">, Type.TLiteral<"failed_unload">]>;
/**
 * Résumé de santé du hub (contrat 0.3.0). Des codes, des versions, des dates et des comptes : jamais
 * de titre d'intégration, d'`entity_id`, de nom d'appareil, d'emplacement de sauvegarde ni de
 * journal. L'add-on rapporte, le central juge : aucun seuil ici.
 *
 * Chaque sous-bloc vaut `null` quand sa lecture a échoué, et `probeErrors` dit lesquelles : le
 * central distingue « inconnu » de « tout va bien ».
 */
export declare const HealthV1: Type.TObject<{
    collectedAt: Type.TString;
    updates: Type.TUnion<[Type.TObject<{
        items: Type.TArray<Type.TObject<{
            component: Type.TUnion<[Type.TLiteral<"core">, Type.TLiteral<"os">, Type.TLiteral<"supervisor">, Type.TLiteral<"addon">]>;
            /** Slug de l'add-on, pour `addon` seulement. */
            slug: Type.TOptional<Type.TString>;
            version: Type.TString;
            latest: Type.TString;
        }>>;
        /** Autres mises à jour disponibles (HACS, firmwares Zigbee…) : un compte seulement. */
        otherCount: Type.TInteger;
    }>, Type.TNull]>;
    backup: Type.TUnion<[Type.TObject<{
        /** Dernière sauvegarde automatique réussie. */
        lastSuccessAt: Type.TUnion<[Type.TString, Type.TNull]>;
        /** Dernière tentative de sauvegarde automatique, réussie ou non. */
        lastAttemptAt: Type.TUnion<[Type.TString, Type.TNull]>;
        /** La dernière tentative a échoué. */
        lastAttemptFailed: Type.TUnion<[Type.TBoolean, Type.TNull]>;
        /** Au moins une destination hors du hub (cloud, NAS…), sans dire laquelle. */
        offHubCopy: Type.TUnion<[Type.TBoolean, Type.TNull]>;
    }>, Type.TNull]>;
    disk: Type.TUnion<[Type.TObject<{
        totalGb: Type.TNumber;
        freeGb: Type.TNumber;
    }>, Type.TNull]>;
    integrations: Type.TUnion<[Type.TArray<Type.TObject<{
        domain: Type.TString;
        state: Type.TUnion<[Type.TLiteral<"setup_error">, Type.TLiteral<"setup_retry">, Type.TLiteral<"migration_error">, Type.TLiteral<"failed_unload">]>;
    }>>, Type.TNull]>;
    /** Réparations signalées par HA, hors Spook et hors liste « génériques » de l'add-on. */
    repairs: Type.TUnion<[Type.TArray<Type.TObject<{
        domain: Type.TString;
        /** `translation_key` de la réparation, jamais son `issue_id` (qui peut citer une entité). */
        key: Type.TString;
        severity: Type.TUnion<[Type.TLiteral<"critical">, Type.TLiteral<"error">, Type.TLiteral<"warning">]>;
    }>>, Type.TNull]>;
    /** Centre de résolution du Supervisor : raisons d'« unhealthy » et d'« unsupported ». */
    system: Type.TUnion<[Type.TObject<{
        unhealthy: Type.TArray<Type.TString>;
        unsupported: Type.TArray<Type.TString>;
    }>, Type.TNull]>;
    probeErrors: Type.TArray<Type.TString>;
}>;
export type HealthV1 = Type.Static<typeof HealthV1>;
/**
 * Battement de cœur, version 1. Uniquement de l'état technique : jamais de présence, de caméra,
 * de serrure ni de calendrier (cadrage du 16/11/2026).
 */
export declare const HeartbeatV1: Type.TObject<{
    schema: Type.TLiteral<"velarys.heartbeat/1">;
    sentAt: Type.TString;
    agent: Type.TObject<{
        version: Type.TString;
    }>;
    ha: Type.TObject<{
        /** `false` = l'API de Home Assistant ne répond pas, alors que l'add-on et le Supervisor tournent. */
        reachable: Type.TBoolean;
        version: Type.TUnion<[Type.TString, Type.TNull]>;
    }>;
    supervisor: Type.TObject<{
        version: Type.TUnion<[Type.TString, Type.TNull]>;
        healthy: Type.TUnion<[Type.TBoolean, Type.TNull]>;
    }>;
    os: Type.TObject<{
        version: Type.TUnion<[Type.TString, Type.TNull]>;
    }>;
    host: Type.TObject<{
        uptimeSec: Type.TUnion<[Type.TInteger, Type.TNull]>;
    }>;
    /**
     * Réglages de l'add-on lui-même, ceux de son onglet Info (contrat 0.2.0). Facultatif : absent =
     * inconnu (agent 0.1.4 et antérieurs) ; `null` = le Supervisor n'a pas répondu.
     */
    addon: Type.TOptional<Type.TObject<{
        /** « Chien de garde » : le Supervisor relance l'add-on s'il s'arrête. */
        watchdog: Type.TUnion<[Type.TBoolean, Type.TNull]>;
        /** « Mise à jour automatique » de l'add-on (pas celle de HA ni de l'OS). */
        autoUpdate: Type.TUnion<[Type.TBoolean, Type.TNull]>;
        /** « Lancer au démarrage » : `auto` = l'add-on repart avec la machine. */
        boot: Type.TUnion<[Type.TLiteral<"auto">, Type.TLiteral<"manual">, Type.TNull]>;
    }>>;
    /**
     * Résumé de santé (contrat 0.3.0). Facultatif : absent = agent antérieur, ou relevé pas encore
     * fait depuis le démarrage.
     */
    health: Type.TOptional<Type.TObject<{
        collectedAt: Type.TString;
        updates: Type.TUnion<[Type.TObject<{
            items: Type.TArray<Type.TObject<{
                component: Type.TUnion<[Type.TLiteral<"core">, Type.TLiteral<"os">, Type.TLiteral<"supervisor">, Type.TLiteral<"addon">]>;
                /** Slug de l'add-on, pour `addon` seulement. */
                slug: Type.TOptional<Type.TString>;
                version: Type.TString;
                latest: Type.TString;
            }>>;
            /** Autres mises à jour disponibles (HACS, firmwares Zigbee…) : un compte seulement. */
            otherCount: Type.TInteger;
        }>, Type.TNull]>;
        backup: Type.TUnion<[Type.TObject<{
            /** Dernière sauvegarde automatique réussie. */
            lastSuccessAt: Type.TUnion<[Type.TString, Type.TNull]>;
            /** Dernière tentative de sauvegarde automatique, réussie ou non. */
            lastAttemptAt: Type.TUnion<[Type.TString, Type.TNull]>;
            /** La dernière tentative a échoué. */
            lastAttemptFailed: Type.TUnion<[Type.TBoolean, Type.TNull]>;
            /** Au moins une destination hors du hub (cloud, NAS…), sans dire laquelle. */
            offHubCopy: Type.TUnion<[Type.TBoolean, Type.TNull]>;
        }>, Type.TNull]>;
        disk: Type.TUnion<[Type.TObject<{
            totalGb: Type.TNumber;
            freeGb: Type.TNumber;
        }>, Type.TNull]>;
        integrations: Type.TUnion<[Type.TArray<Type.TObject<{
            domain: Type.TString;
            state: Type.TUnion<[Type.TLiteral<"setup_error">, Type.TLiteral<"setup_retry">, Type.TLiteral<"migration_error">, Type.TLiteral<"failed_unload">]>;
        }>>, Type.TNull]>;
        /** Réparations signalées par HA, hors Spook et hors liste « génériques » de l'add-on. */
        repairs: Type.TUnion<[Type.TArray<Type.TObject<{
            domain: Type.TString;
            /** `translation_key` de la réparation, jamais son `issue_id` (qui peut citer une entité). */
            key: Type.TString;
            severity: Type.TUnion<[Type.TLiteral<"critical">, Type.TLiteral<"error">, Type.TLiteral<"warning">]>;
        }>>, Type.TNull]>;
        /** Centre de résolution du Supervisor : raisons d'« unhealthy » et d'« unsupported ». */
        system: Type.TUnion<[Type.TObject<{
            unhealthy: Type.TArray<Type.TString>;
            unsupported: Type.TArray<Type.TString>;
        }>, Type.TNull]>;
        probeErrors: Type.TArray<Type.TString>;
    }>>;
}>;
export type HeartbeatV1 = Type.Static<typeof HeartbeatV1>;
export declare const HeartbeatResponse: Type.TObject<{
    accepted: Type.TLiteral<true>;
    nextIntervalSec: Type.TInteger;
}>;
export type HeartbeatResponse = Type.Static<typeof HeartbeatResponse>;
export declare const HealthResponse: Type.TObject<{
    status: Type.TLiteral<"ok">;
    heartbeatSchemas: Type.TArray<Type.TString>;
}>;
export type HealthResponse = Type.Static<typeof HealthResponse>;
/**
 * Demandes du hub (contrat 0.4.0) : assistance ou évolution. Le texte libre du client ne circule que
 * scellé pour le central (`seal.ts`) ; rien de libre ne redescend vers le hub, qui ne reçoit que des
 * statuts choisis dans une liste fermée.
 */
export declare const TicketKind: Type.TUnion<[Type.TLiteral<"assistance">, Type.TLiteral<"evolution">]>;
export type TicketKind = Type.Static<typeof TicketKind>;
export declare const TicketStatus: Type.TUnion<[Type.TLiteral<"new">, Type.TLiteral<"in_progress">, Type.TLiteral<"closed">]>;
export type TicketStatus = Type.Static<typeof TicketStatus>;
/** Issue d'une demande close : réalisée ou écartée (évolution surtout, une assistance close vaut `done`). */
export declare const TicketOutcome: Type.TUnion<[Type.TLiteral<"done">, Type.TLiteral<"declined">, Type.TNull]>;
export type TicketOutcome = Type.Static<typeof TicketOutcome>;
export declare const SealedText: Type.TObject<{
    kid: Type.TString;
    enc: Type.TString;
    /** 2 000 caractères de 4 octets au pire, plus l'étiquette GCM, en base64url. */
    ct: Type.TString;
}>;
export type SealedText = Type.Static<typeof SealedText>;
export declare const TicketCreateRequest: Type.TObject<{
    schema: Type.TLiteral<"velarys.ticket/1">;
    kind: Type.TUnion<[Type.TLiteral<"assistance">, Type.TLiteral<"evolution">]>;
    sealed: Type.TObject<{
        kid: Type.TString;
        enc: Type.TString;
        /** 2 000 caractères de 4 octets au pire, plus l'étiquette GCM, en base64url. */
        ct: Type.TString;
    }>;
}>;
export type TicketCreateRequest = Type.Static<typeof TicketCreateRequest>;
/**
 * Message du fil d'une demande, tel que le hub le reçoit (contrat 0.5.0) :
 * - du client : l'identifiant seul, le hub a gardé le texte ;
 * - de Velarys, message type : un code de liste fermée, le hub affiche son propre texte ;
 * - de Velarys, texte libre : scellé pour la clé de réponse de ce hub, et signé par passkey à
 *   l'intérieur (`SignedReply`). Le hub ne l'affiche que si la signature est valide.
 */
export declare const TicketMessage: Type.TUnion<[Type.TObject<{
    id: Type.TString;
    author: Type.TLiteral<"client">;
    createdAt: Type.TString;
}>, Type.TObject<{
    id: Type.TString;
    author: Type.TLiteral<"velarys">;
    createdAt: Type.TString;
    template: Type.TUnsafe<"checking" | "fixed" | "need_details" | "not_possible" | "quote_coming" | "received" | "visit_needed" | "will_call">;
}>, Type.TObject<{
    id: Type.TString;
    author: Type.TLiteral<"velarys">;
    createdAt: Type.TString;
    sealed: Type.TObject<{
        kid: Type.TString;
        enc: Type.TString;
        ct: Type.TString;
    }>;
}>]>;
export type TicketMessage = Type.Static<typeof TicketMessage>;
/** Ce que le hub sait d'une demande : jamais le texte (il le garde de son côté), jamais de note. */
export declare const TicketSummary: Type.TObject<{
    id: Type.TString;
    kind: Type.TUnion<[Type.TLiteral<"assistance">, Type.TLiteral<"evolution">]>;
    status: Type.TUnion<[Type.TLiteral<"new">, Type.TLiteral<"in_progress">, Type.TLiteral<"closed">]>;
    outcome: Type.TUnion<[Type.TLiteral<"done">, Type.TLiteral<"declined">, Type.TNull]>;
    createdAt: Type.TString;
    updatedAt: Type.TString;
    /** Fil (contrat 0.5.0), renvoyé seulement au hub qui a donné sa clé de réponse. */
    messages: Type.TOptional<Type.TArray<Type.TUnion<[Type.TObject<{
        id: Type.TString;
        author: Type.TLiteral<"client">;
        createdAt: Type.TString;
    }>, Type.TObject<{
        id: Type.TString;
        author: Type.TLiteral<"velarys">;
        createdAt: Type.TString;
        template: Type.TUnsafe<"checking" | "fixed" | "need_details" | "not_possible" | "quote_coming" | "received" | "visit_needed" | "will_call">;
    }>, Type.TObject<{
        id: Type.TString;
        author: Type.TLiteral<"velarys">;
        createdAt: Type.TString;
        sealed: Type.TObject<{
            kid: Type.TString;
            enc: Type.TString;
            ct: Type.TString;
        }>;
    }>]>>>;
}>;
export type TicketSummary = Type.Static<typeof TicketSummary>;
export declare const TicketCreateResponse: Type.TObject<{
    ticket: Type.TObject<{
        id: Type.TString;
        kind: Type.TUnion<[Type.TLiteral<"assistance">, Type.TLiteral<"evolution">]>;
        status: Type.TUnion<[Type.TLiteral<"new">, Type.TLiteral<"in_progress">, Type.TLiteral<"closed">]>;
        outcome: Type.TUnion<[Type.TLiteral<"done">, Type.TLiteral<"declined">, Type.TNull]>;
        createdAt: Type.TString;
        updatedAt: Type.TString;
        /** Fil (contrat 0.5.0), renvoyé seulement au hub qui a donné sa clé de réponse. */
        messages: Type.TOptional<Type.TArray<Type.TUnion<[Type.TObject<{
            id: Type.TString;
            author: Type.TLiteral<"client">;
            createdAt: Type.TString;
        }>, Type.TObject<{
            id: Type.TString;
            author: Type.TLiteral<"velarys">;
            createdAt: Type.TString;
            template: Type.TUnsafe<"checking" | "fixed" | "need_details" | "not_possible" | "quote_coming" | "received" | "visit_needed" | "will_call">;
        }>, Type.TObject<{
            id: Type.TString;
            author: Type.TLiteral<"velarys">;
            createdAt: Type.TString;
            sealed: Type.TObject<{
                kid: Type.TString;
                enc: Type.TString;
                ct: Type.TString;
            }>;
        }>]>>>;
    }>;
}>;
export type TicketCreateResponse = Type.Static<typeof TicketCreateResponse>;
/**
 * Corps de la liste, signé par le hub qui demande les siennes. `replyKey` (contrat 0.5.0) : clé
 * publique X25519 du hub, pour que le central lui scelle les réponses libres ; sa présence demande
 * aussi le fil des messages. La signature du hub empêche le tunnel de la remplacer.
 */
export declare const TicketListRequest: Type.TObject<{
    replyKey: Type.TOptional<Type.TObject<{
        kid: Type.TString;
        publicKey: Type.TString;
    }>>;
}>;
export type TicketListRequest = Type.Static<typeof TicketListRequest>;
export declare const TicketListResponse: Type.TObject<{
    tickets: Type.TArray<Type.TObject<{
        id: Type.TString;
        kind: Type.TUnion<[Type.TLiteral<"assistance">, Type.TLiteral<"evolution">]>;
        status: Type.TUnion<[Type.TLiteral<"new">, Type.TLiteral<"in_progress">, Type.TLiteral<"closed">]>;
        outcome: Type.TUnion<[Type.TLiteral<"done">, Type.TLiteral<"declined">, Type.TNull]>;
        createdAt: Type.TString;
        updatedAt: Type.TString;
        /** Fil (contrat 0.5.0), renvoyé seulement au hub qui a donné sa clé de réponse. */
        messages: Type.TOptional<Type.TArray<Type.TUnion<[Type.TObject<{
            id: Type.TString;
            author: Type.TLiteral<"client">;
            createdAt: Type.TString;
        }>, Type.TObject<{
            id: Type.TString;
            author: Type.TLiteral<"velarys">;
            createdAt: Type.TString;
            template: Type.TUnsafe<"checking" | "fixed" | "need_details" | "not_possible" | "quote_coming" | "received" | "visit_needed" | "will_call">;
        }>, Type.TObject<{
            id: Type.TString;
            author: Type.TLiteral<"velarys">;
            createdAt: Type.TString;
            sealed: Type.TObject<{
                kid: Type.TString;
                enc: Type.TString;
                ct: Type.TString;
            }>;
        }>]>>>;
    }>>;
}>;
export type TicketListResponse = Type.Static<typeof TicketListResponse>;
export declare const TicketMessageCreateRequest: Type.TObject<{
    schema: Type.TLiteral<"velarys.ticket-message/1">;
    ticketId: Type.TString;
    sealed: Type.TObject<{
        kid: Type.TString;
        enc: Type.TString;
        /** 2 000 caractères de 4 octets au pire, plus l'étiquette GCM, en base64url. */
        ct: Type.TString;
    }>;
}>;
export type TicketMessageCreateRequest = Type.Static<typeof TicketMessageCreateRequest>;
export declare const TicketMessageCreateResponse: Type.TObject<{
    message: Type.TObject<{
        id: Type.TString;
        author: Type.TLiteral<"client">;
        createdAt: Type.TString;
    }>;
}>;
export type TicketMessageCreateResponse = Type.Static<typeof TicketMessageCreateResponse>;
/** Passkeys de signature des réponses, lues seulement hors production (épinglées sinon). */
export declare const ReplyKeysResponse: Type.TObject<{
    keys: Type.TArray<Type.TObject<{
        credentialId: Type.TString;
        alg: Type.TUnion<[Type.TLiteral<-7>, Type.TLiteral<-8>]>;
        publicKey: Type.TString;
        rpIdHash: Type.TString;
        originHash: Type.TString;
    }>>;
}>;
export type ReplyKeysResponse = Type.Static<typeof ReplyKeysResponse>;
/** Clé publique de scellement du central. Lue seulement hors production : en production, elle est épinglée. */
export declare const SealKeyResponse: Type.TObject<{
    alg: Type.TLiteral<"hpke-x25519-hkdfsha256-aes128gcm">;
    kid: Type.TString;
    publicKey: Type.TString;
}>;
export type SealKeyResponse = Type.Static<typeof SealKeyResponse>;
/** Erreurs typées : l'add-on agit selon `error`, jamais selon le message. */
export declare const HubErrorCode: Type.TUnion<[Type.TLiteral<"invalid_request">, Type.TLiteral<"invalid_signature">, Type.TLiteral<"unknown_hub">, Type.TLiteral<"revoked">, Type.TLiteral<"replayed">, Type.TLiteral<"code_invalid">, Type.TLiteral<"code_used">, Type.TLiteral<"code_expired">, Type.TLiteral<"key_already_enrolled">, Type.TLiteral<"unsupported_schema">, Type.TLiteral<"tickets_disabled">, Type.TLiteral<"unknown_seal_key">, Type.TLiteral<"undecryptable">, Type.TLiteral<"message_too_long">, Type.TLiteral<"rate_limited">, Type.TLiteral<"unknown_ticket">, Type.TLiteral<"ticket_closed">]>;
export type HubErrorCode = Type.Static<typeof HubErrorCode>;
export declare const HubError: Type.TObject<{
    error: Type.TUnion<[Type.TLiteral<"invalid_request">, Type.TLiteral<"invalid_signature">, Type.TLiteral<"unknown_hub">, Type.TLiteral<"revoked">, Type.TLiteral<"replayed">, Type.TLiteral<"code_invalid">, Type.TLiteral<"code_used">, Type.TLiteral<"code_expired">, Type.TLiteral<"key_already_enrolled">, Type.TLiteral<"unsupported_schema">, Type.TLiteral<"tickets_disabled">, Type.TLiteral<"unknown_seal_key">, Type.TLiteral<"undecryptable">, Type.TLiteral<"message_too_long">, Type.TLiteral<"rate_limited">, Type.TLiteral<"unknown_ticket">, Type.TLiteral<"ticket_closed">]>;
    message: Type.TString;
}>;
export type HubError = Type.Static<typeof HubError>;
