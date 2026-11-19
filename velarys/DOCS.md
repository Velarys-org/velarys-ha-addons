# Suivi et Maintenance

Cet add-on relie votre installation Home Assistant au service de suivi Velarys. Il signale
régulièrement au central Velarys que l'installation fonctionne, pour que Velarys repère une panne
avant vous.

## Ce que l'add-on envoie

Toutes les cinq minutes environ, un « battement de cœur » qui contient uniquement :

- la version de Home Assistant, et si Home Assistant répond ;
- la version du Supervisor, et s'il se déclare en bonne santé ;
- la version de Home Assistant OS ;
- depuis combien de temps la machine est démarrée ;
- la version de l'add-on, et s'il est réglé pour redémarrer seul (chien de garde), se mettre à jour
  et démarrer avec la machine.

C'est le silence qui alerte : si les battements cessent, Velarys sait que l'installation ne
répond plus.

## Ce que l'add-on n'envoie jamais

Rien sur la vie du logement : ni présence, ni caméras, ni serrures, ni calendriers, ni historique
des capteurs, ni journaux. Le contenu exact d'un battement est fixé par un contrat versionné, et le
central refuse tout champ qui n'y figure pas.

## Installation

1. Dans Home Assistant, **Paramètres > Applications > Installer une application**, menu ⋮ en haut
   à droite, **Dépôts**, puis **Ajouter** `https://github.com/Velarys-org/velarys-ha-addons`.
2. Dans le magasin d'applications, ouvrir **Suivi et Maintenance**, dans la section **Velarys**, et
   cliquer sur **Installer**.
3. Dans l'onglet **Configuration**, saisir le **code d'enrôlement** fourni par Velarys, puis
   enregistrer.
4. Dans l'onglet **Info**, activer **Chien de garde** (relance l'add-on s'il s'arrête) et
   **Mise à jour automatique**, laisser **Lancer au démarrage** activé, puis cliquer sur
   **Démarrer**. L'onglet **Journal** confirme l'enrôlement. Velarys voit ces trois réglages à
   distance.

Depuis Home Assistant 2026, les « modules complémentaires » s'appellent des « applications »
(*Apps*) dans l'interface.

L'add-on crée alors l'identité de votre installation : une clé générée sur place, qui ne quitte
jamais votre logement. Le code est retiré de la configuration dès qu'il a servi. Il n'est valable
qu'une fois et quelques heures.

## Options

| Option | Rôle |
|---|---|
| `central_url` | Adresse du central Velarys. Ne pas modifier sans indication de Velarys. |
| `enrollment_code` | Code d'enrôlement à usage unique. Vide une fois l'add-on enrôlé. |
| `hub_name` | Nom facultatif pour distinguer plusieurs installations (« Résidence secondaire »). Ni adresse ni nom de famille. |
| `heartbeat_interval` | Intervalle souhaité, en secondes. Le central peut en imposer un autre. |
| `log_level` | Niveau de détail du journal de l'add-on. |

## Sauvegardes et restauration

La clé de l'installation est **volontairement exclue des sauvegardes** de Home Assistant. Après une
restauration, ou sur une nouvelle machine, l'add-on demande un nouveau code d'enrôlement : une
sauvegarde ne permet donc jamais de se faire passer pour votre installation.

## Fin du suivi

Velarys peut révoquer une installation (fin de contrat, machine remplacée). L'add-on cesse alors
d'envoyer quoi que ce soit et l'indique dans son journal. Vous pouvez aussi simplement arrêter ou
désinstaller l'add-on.

## Réseau

L'add-on n'ouvre aucun port. Il émet seulement des requêtes HTTPS sortantes vers
`hub.velarys.fr`, signées par la clé de l'installation. Un profil AppArmor le limite en plus à ses
propres fichiers et à ces connexions : même détourné, il ne pourrait lancer aucun autre programme.
