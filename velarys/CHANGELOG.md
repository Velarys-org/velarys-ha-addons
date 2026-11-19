# Changelog

## 0.1.5

- Le battement indique si le chien de garde, la mise à jour automatique et le lancement au
  démarrage de l'add-on sont activés, pour que Velarys repère un réglage oublié à l'installation.

## 0.1.4

- Profil AppArmor propre à l'add-on : il ne peut lire que ses fichiers, écrire que dans son
  dossier de données et lancer aucun autre programme. Note de sécurité Home Assistant : 8 sur 8.
- Node démarré directement, sans le script d'entrée de l'image de base.

## 0.1.3

- Logo de la fiche : le mot « Velarys » sur la pastille dégradée de l'icône.
- Le lien « Visitez la page » mène à la page de suivi de velarys.fr.

## 0.1.2

- Nom raccourci en « Suivi et Maintenance » : le magasin d'applications le range déjà sous le dépôt Velarys.

## 0.1.1

- Nouveau nom, « Suivi et Maintenance Velarys », et description sans jargon.
- Logo coloré, lisible en thème clair comme en thème sombre.
- Présentation réécrite dans l'onglet Info, avec qui est Velarys. Aucun changement de fonctionnement.

## 0.1.0

- Enrôlement par code à usage unique : paire de clés Ed25519 générée sur le hub, clé privée exclue des sauvegardes.
- Battement de cœur signé (RFC 9421) : versions de Home Assistant, du Supervisor et de l'OS, Home Assistant joignable ou non, durée de fonctionnement.
- Arrêt propre quand le central révoque le hub.
