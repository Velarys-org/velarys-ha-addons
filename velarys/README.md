# Velarys

Cet add-on prévient Velarys quand votre installation Home Assistant tombe en panne, souvent avant
que vous ne le remarquiez. Il fait partie de la maintenance assurée par
[Velarys](https://velarys.fr), installateur domotique à Annecy.

## Comment ça marche

Toutes les cinq minutes, l'add-on envoie un signe de vie à Velarys. S'il se tait, ou si Home
Assistant ne répond plus, Velarys est alerté et revient vers vous.

## Ce qui part

Uniquement l'état technique de l'installation : les versions de Home Assistant, du Supervisor, du
système et de l'add-on, si Home Assistant répond, et depuis combien de temps la box est allumée.

## Ce qui ne part jamais

Rien sur la vie du logement : ni présence, ni caméras, ni serrures, ni calendriers, ni historique
des capteurs, ni journaux. Le serveur Velarys refuse tout message qui en contiendrait.

## Sécurité

- Aucun port ouvert sur votre box : l'add-on ne fait que des connexions HTTPS sortantes.
- Chaque message est signé par une clé créée sur votre box. Elle ne quitte jamais le logement et
  n'est pas copiée dans les sauvegardes.
- Le code est public, sous licence MIT :
  [github.com/Velarys-org/velarys-ha-addons](https://github.com/Velarys-org/velarys-ha-addons).

## Installation

Il vous faut Home Assistant OS et le code d'enrôlement personnel que Velarys vous a transmis. Pas
encore de code ? Demandez-le à [contact@velarys.fr](mailto:contact@velarys.fr). La marche à suivre
pas à pas est dans l'onglet **Documentation**.

---

## In English

This add-on alerts Velarys when your Home Assistant installation goes down, often before you
notice. It is part of the maintenance provided by [Velarys](https://velarys.fr), a home automation
installer based in Annecy, France.

Every five minutes it sends Velarys a sign of life holding only technical state: software versions,
whether Home Assistant responds, and uptime. Nothing about life in your home ever leaves it: no
presence, cameras, locks, calendars, sensor history or logs.

No port is opened, every message is signed by a key created on your hub, and the source code is
public under the MIT licence. You need the one-time enrolment code sent to you by Velarys (ask
[contact@velarys.fr](mailto:contact@velarys.fr) if you don't have one); step-by-step instructions
are in the **Documentation** tab.
