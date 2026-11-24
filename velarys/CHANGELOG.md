# Changelog

## 0.3.0-beta.11

Canal bêta seulement.

- Les demandes fonctionnent avec le central Velarys de production : le texte est chiffré pour sa clé,
  embarquée dans l'application, et une réponse écrite par Velarys ne s'affiche que si elle porte la
  signature de la passkey de Velarys, elle aussi embarquée.

## 0.3.0-beta.10

Canal bêta seulement.

- Vos demandes en un seul carnet : l'état en clair sur chaque ligne, les demandes en cours en haut,
  les terminées rangées et repliées en bas du carnet.
- Fenêtre de création plus claire, avec la garantie de chiffrement à côté du bouton d'envoi ; sur
  téléphone, elle s'ouvre comme un panneau qui monte du bas.
- L'avertissement « urgence » reste dans la fenêtre de création et sur la page d'une demande, plus
  sur l'accueil.
- Bas de page : la lettre d'information d'abord, les réseaux sociaux en simples liens.

## 0.3.0-beta.9

Canal bêta seulement.

- L'avertissement « urgence » passe juste sous les deux actions, là où le client décide d'écrire.

## 0.3.0-beta.8

Canal bêta seulement.

- « Suivre Velarys » sur un fond neutre, sans teinte ; le motif de la marque reste en filigrane.

## 0.3.0-beta.7

Canal bêta seulement.

- Sous la liste des demandes : l'avertissement « urgence » en encadré, un filet, puis « Suivre
  Velarys » sur un fond à part, avec le motif de la marque en filigrane.

## 0.3.0-beta.6

Canal bêta seulement.

- Accueil resserré : « Signaler un problème » et « Demander une intervention » (bientôt).
- Liens vers la lettre d'information et les réseaux sociaux de Velarys, en nouvel onglet.

## 0.3.0-beta.5

Canal bêta seulement.

- Après l'envoi d'une demande, la confirmation s'affiche dans la fenêtre elle-même, avec « Voir ma
  demande » et « Fermer ».

## 0.3.0-beta.4

Canal bêta seulement.

- Une demande s'ouvre comme une page du panneau, avec un retour vers la liste, et non plus dans une
  fenêtre.
- Dates relatives (« il y a 5 min », « il y a 10 j ») ; la date exacte reste au survol.
- Accueil : « Comment pouvons-nous vous aider ? ».

## 0.3.0-beta.3

Canal bêta seulement.

- Panneau repensé pour être simple : trois grandes actions (signaler un problème, proposer une idée,
  demander une intervention, cette dernière bientôt disponible), puis la liste de vos demandes.
- Chaque demande devient une conversation : réponses de Velarys, et vos précisions tant qu'elle est
  ouverte. Une réponse écrite par Velarys n'est affichée que si sa signature est vérifiée par la
  machine.
- Logo et icône de Velarys dans le panneau ; icône « V » dans la barre latérale.

## 0.3.0-beta.2

Canal bêta seulement.

- Le panneau Velarys apparaît dans la barre latérale dès le premier démarrage (Home Assistant
  l'installe masqué). Le masquer ensuite reste possible, et il ne revient pas.

## 0.3.0-beta.1

Canal bêta seulement.

- Panneau « Velarys » dans la barre latérale de Home Assistant : une demande d'assistance ou une
  idée d'évolution s'écrit là, et part chez Velarys avec l'état technique de l'installation.
  Le message est chiffré sur le boîtier, et seul Velarys peut le lire ; le panneau affiche ensuite
  le suivi de chaque demande (reçue, en cours, close).
- Pas pour les urgences, et le panneau le dit : aucune permanence n'est assurée par ce canal.

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
