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
- **Icône de barre latérale** : `panel_icon` n'accepte qu'une icône MDI (vérifié dans le
  Supervisor) ; `mdi:alpha-v-box` faute de mieux. La tuile de marque sert au panneau lui-même.
- **Aucun port publié sur l'hôte**, uniquement du HTTPS sortant vers le central. Le panneau Velarys
  (ingress, `src/panel.ts`, port interne 8099) n'accepte que le proxy d'ingress du Supervisor
  (`172.30.32.2`), exige l'en-tête `x-velarys-panel` sur toute écriture et sert une CSP stricte
  sans aucune ressource externe (rien ne doit sortir du logement pour afficher la page). Le
  Supervisor installe un panneau d'ingress **masqué** (`ingress_panel: false`) : l'agent l'affiche
  une seule fois (témoin `/data/panel-shown`), un client qui le masque ensuite n'est pas contredit.
- **Demandes (contrat 0.4.0)** : le texte du client est scellé sur le hub (HPKE, `seal.ts` du
  contrat) avant la signature. Pour le central de production, la clé de scellement est **épinglée**
  dans le contrat (`PINNED_SEAL_KEYS`), jamais lue sur le réseau : le tunnel pourrait la remplacer.
  Le hub garde sa propre copie de ce que le client écrit (`/data/tickets.json`) : le central ne lui
  renvoie jamais ce texte. Pas de canal d'urgence, pas de délai affiché : le panneau le dit.
- **Rien de libre ne s'affiche sans signature (contrat 0.5.0)** : une réponse de Velarys est soit un
  message type (code de liste fermée, texte dans `panel/panel.js`, aligné sur l'admin), soit un texte
  libre signé par passkey (WebAuthn), vérifié **sur le hub** contre `PINNED_REPLY_KEYS` avant tout
  affichage. Une signature refusée = message masqué, jamais affiché « à tout hasard ». La réponse
  arrive scellée pour la clé X25519 du hub (`identity.json`, hors sauvegardes, envoyée signée).
- **Panneau pour des personnes peu techniques** : deux grandes actions en haut (problème, et
  intervention désactivée « Bientôt » en attendant l'usecase d'accès distant), la liste des
  demandes dessous, puis l'avertissement « urgence » (encadré ambre léger), un filet, et « Suivre
  Velarys » sur fond neutre sans teinte (le vert a été refusé), motif ribbon de la marque en filigrane (même tuile que `--vproof-v` du
  site, dissoute à 45°) : lettre d'information et réseaux, liens sortants en
  nouvel onglet ; adresses recopiées de `src/data/social.ts` du site, à changer des deux côtés).
  « Proposer une idée » est **mis de côté** (2026-11-24, « ça ne presse pas ») : la carte est retirée,
  le type `evolution` reste au contrat et au central, les idées déjà envoyées restent lisibles. Création en fenêtre ; une demande s'ouvre en **vue** du panneau
  (`#/demande/<id>`, retour du navigateur compris), jamais en fenêtre (demande d'Arnaud). Dates
  relatives (« il y a 5 min »), date exacte au survol. Textes courts, aucun jargon.
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

## Canaux : stable (`main`) et bêta (`beta`)

Home Assistant ne sait pas servir deux versions d'un même add-on selon l'installation. Le canal se
choisit donc **par l'URL du dépôt** ajoutée sur le hub :

- **stable** : `https://github.com/Velarys-org/velarys-ha-addons`, branche `main`, celle des clients ;
- **bêta** : `https://github.com/Velarys-org/velarys-ha-addons#beta`, branche `beta`, ajoutée sur les
  seuls hubs de test. Version en `x.y.z-beta.N`, `stage: experimental`, nom suffixé « (bêta) ».

Le Supervisor identifie un dépôt par l'empreinte de son URL **branche comprise** : l'add-on bêta est
un autre add-on, avec son propre `/data` et donc **sa propre identité**. Passer un hub d'un canal à
l'autre = désinstaller l'un, installer l'autre, réenrôler avec un nouveau code, révoquer l'ancien hub
dans l'admin. **Jamais les deux installés sur une même machine** (deux hubs battraient). Le central
affiche le canal, lu dans la version de l'agent.

Exception assumée à « pas de branche » : `beta` est une branche de **publication**, pas de travail.
Une fonction pas encore publiée se développe sur `beta` (jamais sur `main`, que les clients lisent :
`config.yaml`, `DOCS.md`). Promotion : fusionner `beta` dans `main` en remettant le nom, `stage`,
`repository.yaml` et une version sans suffixe, puis repartir `beta` de `main` au cycle suivant.

## Publication

Augmenter `version` dans `velarys/config.yaml` (et `package.json`, `CHANGELOG.md`) puis pousser sur
`main` ou sur `beta` : `.github/workflows/builder.yaml` construit l'image amd64 et aarch64 avec les actions
`home-assistant/builder`, puis le manifeste multi-arch `ghcr.io/velarys-org/velarys-ha-addon`. Une
version déjà publiée n'est jamais reconstruite, et seul `main` déplace l'étiquette `latest`. **Le package GHCR doit rester public**, sinon les
hubs ne peuvent pas le tirer.

Git : commit direct sur `main` ou `beta` (voir les canaux ci-dessus), pas d'autre branche.
