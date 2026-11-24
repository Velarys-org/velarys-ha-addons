# Changelog

## 0.3.0

- Panneau Velarys dans la barre latérale de Home Assistant, réservé aux administrateurs : vous
  signalez un problème en quelques mots, et la demande part avec l'état technique de l'installation.
  Son texte est chiffré sur la machine pour le seul central Velarys.
- Chaque demande s'ouvre comme une conversation : vous y lisez les réponses de Velarys et pouvez
  ajouter des précisions tant qu'elle est ouverte. Une réponse écrite par Velarys ne s'affiche que si
  la machine y vérifie elle-même la signature de Velarys.
- Les demandes terminées depuis plus de 90 jours passent dans les archives, toujours consultables.
- Le panneau rappelle qu'il n'est pas un canal d'urgence, et donne les liens vers la lettre
  d'information et les réseaux sociaux de Velarys (ouverts dans un nouvel onglet).

## 0.2.0

- Bilan de santé joint au battement, relu toutes les quinze minutes : mises à jour en attente
  (Home Assistant, OS, Supervisor, add-ons, et le nombre des autres), date de la dernière
  sauvegarde réussie, échec de la dernière tentative et copie hors de la machine (oui ou non),
  espace disque, intégrations en échec, réparations signalées par Home Assistant (hors Spook et
  avis génériques) et problèmes du Supervisor. Des codes, des versions et des dates : aucun nom
  d'appareil, de pièce ou d'emplacement ne sort.
- Une lecture qui échoue est signalée comme telle et ne bloque jamais le battement.

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
