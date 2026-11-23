# AGENTS.md

Dépôt **public** des add-ons Home Assistant de Velarys. Aujourd'hui un seul add-on, `velarys/` :
l'agent qui enrôle le hub auprès du central Velarys et lui envoie un battement de cœur signé.

## Mémoire générale (hors dépôt)

Le cadrage (décisions, usecases, pourquoi) vit dans la documentation interne de Velarys, hors de ce
dépôt public. Son emplacement est donné par `CLAUDE.local.md`, non versionné. Ne rien en recopier
ici : ce dépôt ne porte ni chemin local, ni infrastructure, ni donnée client.

## Règles qui ne se discutent pas

- **Rien de secret dans ce dépôt** : il est public. La sécurité tient aux clés, jamais au code.
- **Le contrat appartient au central.** `velarys/vendor/hub-api/` est généré par le dépôt privé
  `velarys-central` (`yarn vendor:hub-api`). Ne jamais l'éditer ici : changer le contrat côté
  central, revendoriser, commiter les deux.
- **Le battement ne porte que de l'état technique.** Jamais de présence, caméra, serrure, calendrier,
  historique ni journal. Un nouveau champ s'ajoute d'abord au contrat côté central, en facultatif
  dans le schéma en cours (retrait ou renommage = nouveau schéma), et **le central est déployé avant
  de publier l'add-on** : l'ancien central refuserait le champ et le hub paraîtrait muet.
- **Le bilan de santé** (`velarys/src/health.ts`, bloc `health` du contrat 0.3.0) rapporte, il ne
  juge pas : les seuils sont au central. Il ne sort que des codes, des versions, des dates et des
  comptes, réduits localement : jamais de titre d'intégration, d'`entity_id`, de nom d'appareil ni
  d'emplacement de sauvegarde (`test/health.test.ts` le vérifie). Les réparations écartées (Spook,
  avis génériques) forment une liste fermée, versionnée ici. Il lit le Supervisor au rôle `default`
  (routes `…/info`) et le WebSocket de HA par le proxy du Supervisor ; vérifié sur la VM HAOS 18.4
  le 2026-11-23, sans refus du Supervisor ni d'AppArmor. Une lecture en échec vaut `null` et un code
  dans `probeErrors`, jamais un battement bloqué.
- **La clé privée ne sort pas du hub** : `/data/identity/` est exclu des sauvegardes
  (`backup_exclude` dans `config.yaml`, deux motifs car le Supervisor compare au chemin complet).
- **Aucun port ouvert**, uniquement du HTTPS sortant vers le central.
- **`velarys/apparmor.txt` confine l'agent** (note de sécurité 8/8) : lecture de `/app`, écriture dans
  `/data` seulement, aucun programme lancé hors Node, d'où l'`ENTRYPOINT` direct du `Dockerfile` (sans
  le `docker-entrypoint.sh` de l'image, qui passe par un shell). Toute fonction qui touche un nouveau
  fichier, lance un programme ou ouvre un autre type de connexion se teste d'abord sur la VM avec
  `complain` dans les flags du profil, en lisant les lignes `apparmor="ALLOWED"` du journal `audit`
  de l'hôte (`ha host logs -t audit`), puis sans.
- **`velarys/DOCS.md` a un double sur le site velarys.fr** : la page de suivi envoyée aux clients
  (dépôt du site, `src/i18n/pages/suivi.js`, en français et en anglais). Une évolution qui change ce
  que dit `DOCS.md` (données envoyées, options, installation, sauvegardes) se reporte aussi là-bas.
  Son URL française est le `url:` de `config.yaml` (lien « Visitez la page » de l'onglet Info), à la
  demande d'Arnaud le 2026-11-19 : elle est donc publique via ce dépôt, mais reste noindex côté site.

## Développement

Dans `velarys/` : Yarn 4 (`nodeLinker: node-modules`), Node 24, TypeScript, Vitest.

- `yarn test` : l'agent contre un faux central qui vérifie réellement les signatures.
- `yarn typecheck`, `yarn build`.
- Essai hors Home Assistant : `DATA_DIR`, `SUPERVISOR_URL` et `SUPERVISOR_TOKEN` surchargent `/data`
  et l'API Supervisor.

## Publication

Augmenter `version` dans `velarys/config.yaml` (et `package.json`, `CHANGELOG.md`) puis pousser sur
`main` : `.github/workflows/builder.yaml` construit l'image amd64 et aarch64 avec les actions
`home-assistant/builder`, puis le manifeste multi-arch `ghcr.io/velarys-org/velarys-ha-addon`. Une
version déjà publiée n'est jamais reconstruite. **Le package GHCR doit rester public**, sinon les
hubs ne peuvent pas le tirer.

Git : commit direct sur `main`, pas de branche.
