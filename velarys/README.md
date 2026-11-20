Cet add-on prévient Velarys quand votre installation Home Assistant tombe en panne, souvent avant
que vous ne le remarquiez.

## Qui est Velarys

[Velarys](https://velarys.fr) conçoit, installe et entretient des installations domotiques sur
mesure en Haute-Savoie et en Savoie, d'Annecy au Mont-Blanc : chauffage, volets, éclairage,
sécurité, résidences secondaires. Ses installations reposent sur Home Assistant et tournent en
local, sans abonnement cloud obligatoire, et les données restent dans le logement.

Si l'on vous a demandé d'installer cet add-on, c'est que Velarys a posé votre installation ou en
assure la maintenance. Il en fait partie : il permet à Velarys de veiller sur votre système sans
venir sur place.

*L'automatisme invisible.*

## Comment ça marche

Toutes les cinq minutes, l'add-on envoie un signe de vie à Velarys. Tant qu'il arrive, tout va
bien et vous n'entendez parler de rien.

S'il se tait, ou s'il indique que Home Assistant ne répond plus, Velarys est alerté et revient
vers vous. C'est le cas d'une box figée, d'un Home Assistant qui ne redémarre pas après une mise à
jour ou d'une coupure de courant qui dure. Une coupure d'internet produit le même silence : Velarys
fait la différence avec vous.

Le signe de vie dit aussi si l'add-on est bien réglé pour redémarrer seul et se tenir à jour. Un
réglage oublié à l'installation se voit donc à distance, sans attendre la panne.

## Ce qui part

Uniquement l'état technique de l'installation : les versions des logiciels, si Home Assistant
répond, depuis combien de temps la box est allumée et les réglages de l'add-on. La liste exacte
est dans l'onglet **Documentation**.

## Ce qui ne part jamais

Rien sur la vie du logement : ni présence, ni caméras, ni serrures, ni calendriers, ni historique
des capteurs, ni journaux. La liste de ce qu'un signe de vie peut contenir est fixée à l'avance, et
le serveur Velarys refuse tout message qui en sortirait.

## Sécurité

- Aucun port ouvert sur votre box : l'add-on ne fait que des connexions HTTPS sortantes vers
  Velarys. Personne ne peut s'y connecter depuis l'extérieur.
- Chaque message est signé par une clé créée sur votre box. Elle ne quitte jamais le logement et
  n'est pas copiée dans les sauvegardes : une sauvegarde volée ou restaurée ailleurs ne permet pas
  de se faire passer pour votre installation.
- Le code d'enrôlement ne sert qu'une fois, expire après quelques heures et disparaît de la
  configuration dès qu'il a servi.
- L'add-on est confiné à ses propres fichiers et ne peut lancer aucun autre programme. Home
  Assistant lui attribue la note de sécurité maximale, 8 sur 8.
- Le code est public, sous licence MIT :
  [github.com/Velarys-org/velarys-ha-addons](https://github.com/Velarys-org/velarys-ha-addons).

## Installation

Il vous faut Home Assistant OS et le code d'enrôlement personnel que Velarys vous a transmis. Pas
encore de code ? Demandez-le à [contact@velarys.fr](mailto:contact@velarys.fr). La marche à suivre
pas à pas est dans l'onglet **Documentation**.

Sans code, l'add-on reste en attente et n'envoie rien.

## Arrêter le suivi

Vous pouvez à tout moment arrêter ou désinstaller l'add-on : les envois cessent aussitôt. En fin
de contrat ou après un changement de machine, Velarys révoque l'installation de son côté, et
l'add-on s'arrête de lui-même en l'indiquant dans son journal.

---

## In English

This add-on alerts Velarys when your Home Assistant installation goes down, often before you
notice.

[Velarys](https://velarys.fr) designs, installs and maintains bespoke home automation in the French
Alps, from Annecy to Mont Blanc. Its installations run on Home Assistant, locally, with no
mandatory cloud subscription, and your data stays in your home. If you were asked to install this
add-on, Velarys set up or maintains your system: the add-on lets it keep an eye on it remotely.

**How it works.** Every five minutes the add-on sends Velarys a sign of life. If it stops, or
reports that Home Assistant no longer responds, Velarys is alerted and gets back to you: a frozen
hub, an update that went wrong, a long power cut. An internet outage looks the same from the
outside, and Velarys will check with you. The sign of life also shows whether the add-on is set to
restart and update on its own, so a forgotten setting is caught before it matters.

**What is sent.** Technical state only: software versions, whether Home Assistant responds, uptime
and the add-on's own settings. Nothing about life in your home ever leaves it: no presence, cameras, locks, calendars,
sensor history or logs. The Velarys server rejects any message holding anything else.

**Security.** No port is opened: the add-on only makes outbound HTTPS requests. Every message is
signed by a key created on your hub, which never leaves it and is left out of backups. The
enrolment code works once, expires within hours and is removed once used. The add-on is confined to
its own files and scores 8 out of 8 on Home Assistant's security rating. The source code is public
under the MIT licence.

**Installation.** You need Home Assistant OS and the one-time enrolment code sent to you by Velarys
(ask [contact@velarys.fr](mailto:contact@velarys.fr) if you don't have one). Without a code the
add-on stays idle. Step-by-step instructions are in the **Documentation** tab.

**Stopping.** You can stop or uninstall the add-on at any time. When a contract ends or the hardware
is replaced, Velarys revokes the installation and the add-on stops sending on its own.
