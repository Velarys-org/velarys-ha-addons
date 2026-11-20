# Add-ons Velarys pour Home Assistant

Dépôt d'add-ons de [Velarys](https://velarys.fr), installateur domotique en Haute-Savoie et en
Savoie. Ces add-ons s'adressent à ses clients.

[![Ajouter le dépôt à Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FVelarys-org%2Fvelarys-ha-addons)

| Add-on | Rôle | Architectures |
|---|---|---|
| [Suivi et Maintenance](velarys/) | Prévient Velarys quand l'installation tombe en panne, sans rien savoir de la vie du logement. | `aarch64`, `amd64` |

Ce que fait l'add-on, ce qu'il envoie et comment l'installer : sa
[présentation](velarys/README.md) et sa [documentation](velarys/DOCS.md), les deux textes qu'affiche
Home Assistant dans les onglets **Info** et **Documentation**.

## Sécurité, côté code

Le code est public pour que chacun puisse vérifier ce qui sort du logement. Rien de secret n'est
dans ce dépôt : la sécurité tient aux clés.

- La paire de clés Ed25519 est générée à l'enrôlement, sur le hub. La clé privée est écrite dans
  `/data/identity/` (dossier en 0700, fichier en 0600), exclue des sauvegardes par `backup_exclude`
  dans [`config.yaml`](velarys/config.yaml).
- Chaque requête est signée selon la RFC 9421 (`content-digest`, `created`, `nonce`) ; le central
  rejette une signature invalide ou rejouée.
- Le contenu d'un battement est fixé par un contrat versionné
  ([`vendor/hub-api/`](velarys/vendor/hub-api/)) ; le central refuse tout champ qui n'y figure pas.
- Uniquement des requêtes HTTPS sortantes : ni port exposé, ni interface web.
- Le profil [`apparmor.txt`](velarys/apparmor.txt) limite la lecture à `/app`, l'écriture à `/data`
  et interdit de lancer un autre programme que Node.

Pour signaler une faille, écrire à [contact@velarys.fr](mailto:contact@velarys.fr) plutôt que d'ouvrir
une issue publique.

## Contenu du dépôt

```
repository.yaml          déclaration du dépôt pour le Supervisor
velarys/                 add-on Suivi et Maintenance
  config.yaml            manifeste (options, permissions, exclusion des sauvegardes)
  apparmor.txt           profil de confinement
  README.md, DOCS.md     onglets Info et Documentation dans Home Assistant
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
the French Alps, for its clients. What the add-on does and sends is described in English at the
end of its [presentation](velarys/README.md). Report security issues to
[contact@velarys.fr](mailto:contact@velarys.fr).

## Licence

[MIT](LICENSE)
