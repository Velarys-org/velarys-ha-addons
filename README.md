# Add-ons Velarys pour Home Assistant

Dépôt d'add-ons de [Velarys](https://velarys.fr), qui conçoit, installe et entretient des
installations domotiques sur mesure en Haute-Savoie et en Savoie, d'Annecy au Mont-Blanc. Ces
installations reposent sur Home Assistant et tournent en local.

[![Ajouter le dépôt à Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FVelarys-org%2Fvelarys-ha-addons)

| Add-on | Rôle | Architectures |
|---|---|---|
| [Suivi et Maintenance](velarys/) | Prévient Velarys quand l'installation tombe en panne, sans rien savoir de la vie du logement. | `aarch64`, `amd64` |

Ces add-ons s'adressent aux clients de Velarys. Suivi et Maintenance ne fait rien sans le code
d'enrôlement personnel que Velarys transmet à l'installation : sur une autre machine, il reste en
attente.

## Suivi et Maintenance

L'add-on envoie toutes les cinq minutes un battement de cœur signé au central Velarys
(`hub.velarys.fr`). C'est le silence qui alerte : si les battements cessent, ou si Home Assistant
ne répond plus, Velarys le voit et intervient, souvent avant que le client ne s'en aperçoive.

Un battement contient uniquement de l'état technique :

- les versions de Home Assistant, du Supervisor, de Home Assistant OS et de l'add-on ;
- si Home Assistant répond et si le Supervisor se déclare en bonne santé ;
- depuis combien de temps la machine est démarrée ;
- si le chien de garde, la mise à jour automatique et le lancement au démarrage de l'add-on sont
  activés.

Rien ne part sur la vie du logement : ni présence, ni caméras, ni serrures, ni calendriers, ni
historique des capteurs, ni journaux. Le contenu d'un battement est fixé par un contrat versionné
et le central refuse tout champ qui n'y figure pas.

La documentation complète (installation pas à pas, options, sauvegardes, fin du suivi) est dans
[`velarys/DOCS.md`](velarys/DOCS.md), affichée aussi dans l'onglet **Documentation** de l'add-on.

## Sécurité

Le code est public pour que chacun puisse vérifier ce qui sort du logement. Rien de secret n'est
dans ce dépôt : la sécurité tient aux clés, pas au code.

- **Identité locale.** À l'enrôlement, l'add-on génère sur place une paire de clés Ed25519. La clé
  privée reste dans `/data/identity/` (fichier en 0600), ne quitte jamais la machine et est exclue
  des sauvegardes de Home Assistant : une sauvegarde restaurée ailleurs ne peut pas se faire passer
  pour l'installation, elle demande un nouveau code.
- **Code à usage unique.** Le code d'enrôlement ne sert qu'une fois, expire après quelques heures et
  est retiré de la configuration dès qu'il a servi.
- **Messages signés.** Chaque requête est signée selon la RFC 9421 (HTTP Message Signatures). Le
  central rejette une signature invalide ou un message rejoué.
- **Aucun port ouvert.** L'add-on n'émet que des requêtes HTTPS sortantes vers le central. Il
  n'expose aucun service et n'a pas d'interface web.
- **Confinement AppArmor.** Un profil propre à l'add-on ([`velarys/apparmor.txt`](velarys/apparmor.txt))
  limite la lecture à son code, l'écriture à son dossier de données, et interdit de lancer tout
  autre programme que Node. Note de sécurité Home Assistant : 8 sur 8.
- **Révocation.** Velarys peut révoquer une installation depuis le central (fin de contrat, machine
  remplacée). L'add-on cesse alors tout envoi et l'indique dans son journal.

Pour signaler une faille, écrire à [contact@velarys.fr](mailto:contact@velarys.fr) plutôt que d'ouvrir
une issue publique.

## Installation

Il faut Home Assistant OS et un code d'enrôlement fourni par Velarys.

1. Ajouter le dépôt avec le bouton ci-dessus, ou à la main : **Paramètres > Applications >
   Installer une application**, menu ⋮, **Dépôts**, puis
   `https://github.com/Velarys-org/velarys-ha-addons`.
2. Installer **Suivi et Maintenance**, saisir le code dans l'onglet **Configuration**, puis
   démarrer l'add-on.

Le détail de chaque étape est dans [`velarys/DOCS.md`](velarys/DOCS.md#installation).

## Contenu du dépôt

```
repository.yaml          déclaration du dépôt pour le Supervisor
velarys/                 add-on Suivi et Maintenance
  config.yaml            manifeste (options, permissions, exclusion des sauvegardes)
  apparmor.txt           profil de confinement
  DOCS.md, README.md     onglets Documentation et Info dans Home Assistant
  src/                   agent en TypeScript (enrôlement, battement, API Supervisor)
  test/                  tests contre un faux central qui vérifie les signatures
  vendor/hub-api/        contrat hub ↔ central, généré côté central
```

## Développement

Dans `velarys/` : Node 24, Yarn 4, TypeScript et Vitest.

```sh
corepack enable
yarn install
yarn test        # l'agent contre un faux central qui vérifie réellement les signatures
yarn typecheck
yarn build
```

Pour essayer l'agent hors de Home Assistant, les variables `DATA_DIR`, `SUPERVISOR_URL` et
`SUPERVISOR_TOKEN` remplacent `/data` et l'API Supervisor.

Le dossier `velarys/vendor/hub-api/` est généré par le central Velarys, qui fait autorité sur le
contrat. Il ne se modifie pas à la main dans ce dépôt.

Chaque push sur `main` lance les tests, la vérification des types et un build de l'image. Une
nouvelle `version` dans `velarys/config.yaml` déclenche la construction des images `amd64` et
`aarch64`, publiées sur `ghcr.io/velarys-org/velarys-ha-addon`. L'historique des versions est dans
[`velarys/CHANGELOG.md`](velarys/CHANGELOG.md).

## In English

Home Assistant add-on repository of [Velarys](https://velarys.fr), a home automation installer in
the French Alps. **Suivi et Maintenance** (monitoring and maintenance) sends a signed heartbeat to
Velarys every five minutes so that a failed installation is spotted, often before the owner
notices.

The heartbeat holds technical state only: software versions, whether Home Assistant and the
Supervisor are healthy, uptime and the add-on's own settings. Nothing about life in the home is
ever sent: no presence, cameras, locks, calendars, sensor history or logs.

The add-on opens no port and only makes outbound HTTPS requests. Each request is signed (RFC 9421)
with an Ed25519 key generated on the hub, which never leaves it and is excluded from backups. An
AppArmor profile confines the add-on to its own files. It needs Home Assistant OS and a one-time
enrolment code from Velarys; without one it stays idle.

Report security issues to [contact@velarys.fr](mailto:contact@velarys.fr).

## Licence

[MIT](LICENSE)
