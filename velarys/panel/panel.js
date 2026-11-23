// Panneau Velarys (ingress de l'add-on). Aucune dépendance, aucune ressource externe : tout est servi
// par l'add-on, par chemins relatifs (le Supervisor le publie sous /api/hassio_ingress/<jeton>/).
'use strict';

const MAX_CHARS = 2000;
const NB = ' ';

const T = {
  fr: {
    subtitle: 'Suivi et maintenance',
    intro: `Un souci avec votre installation, ou une idée pour l’améliorer${NB}? Écrivez-nous ici. Votre message part avec l’état technique de votre installation${NB}: vous n’avez rien d’autre à chercher.`,
    kindLegend: 'Type de demande',
    kindAssistance: 'Demande d’assistance',
    kindAssistanceHint: 'Quelque chose ne marche plus comme d’habitude.',
    kindEvolution: 'Idée d’évolution',
    kindEvolutionHint: 'Un scénario, un appareil à ajouter, une pièce à équiper.',
    messageLabel: 'Votre message',
    placeholderAssistance: 'Ce qui se passe, depuis quand, dans quelle pièce…',
    placeholderEvolution: 'Ce que vous aimeriez que votre logement fasse…',
    privacyHint: 'N’écrivez ni code d’alarme, ni mot de passe, ni adresse.',
    urgentTitle: 'Pas pour les urgences.',
    urgentText: `Fuite d’eau, intrusion, panne de chauffage en hiver${NB}: appelez directement votre artisan ou les secours (17, 18 ou 112). Ce panneau n’est pas surveillé en permanence.`,
    send: 'Envoyer',
    sending: 'Envoi…',
    sent: 'Demande envoyée. Velarys revient vers vous par les moyens habituels.',
    encryption: 'Votre message est chiffré sur ce boîtier, et seul Velarys peut le lire.',
    listTitle: 'Vos demandes',
    empty: 'Aucune demande envoyée depuis ce boîtier.',
    noText: 'Texte non conservé sur ce boîtier.',
    loading: 'Chargement…',
    listError: 'Le suivi des demandes est indisponible pour l’instant.',
    counter: (n) => `${n.toLocaleString('fr-FR')} / 2${NB}000`,
    status: { new: 'Reçue', in_progress: 'En cours', closed: 'Close' },
    outcome: { done: { assistance: 'réglée', evolution: 'réalisée' }, declined: 'écartée' },
    kind: { assistance: 'Assistance', evolution: 'Évolution' },
    errors: {
      not_enrolled: 'Ce boîtier n’est pas encore relié à Velarys. Le panneau fonctionnera une fois l’installation terminée.',
      revoked: 'Le suivi Velarys de ce boîtier est arrêté.',
      empty: 'Le message est vide.',
      message_too_long: `Le message dépasse 2${NB}000 caractères.`,
      tickets_disabled: 'Les demandes ne sont pas encore ouvertes. Contactez Velarys par les moyens habituels.',
      rate_limited: 'Plusieurs demandes sont déjà parties aujourd’hui depuis ce boîtier. Réessayez demain, ou contactez Velarys directement.',
      unreachable: `Velarys est injoignable pour l’instant. Votre message n’est pas parti${NB}: réessayez dans quelques minutes.`,
      default: 'La demande n’a pas pu être envoyée. Réessayez plus tard, ou contactez Velarys directement.',
    },
    date: 'fr-FR',
  },
  en: {
    subtitle: 'Monitoring and maintenance',
    intro: 'Something wrong with your installation, or an idea to improve it? Write to us here. Your message is sent with the technical state of your installation, so there is nothing else to look up.',
    kindLegend: 'Type of request',
    kindAssistance: 'Support request',
    kindAssistanceHint: 'Something no longer works as usual.',
    kindEvolution: 'Improvement idea',
    kindEvolutionHint: 'A scene, a device to add, a room to equip.',
    messageLabel: 'Your message',
    placeholderAssistance: 'What is happening, since when, in which room…',
    placeholderEvolution: 'What you would like your home to do…',
    privacyHint: 'Do not write any alarm code, password or address.',
    urgentTitle: 'Not for emergencies.',
    urgentText: 'Water leak, break-in, heating failure in winter: call your tradesperson or the emergency services (112) directly. This panel is not monitored around the clock.',
    send: 'Send',
    sending: 'Sending…',
    sent: 'Request sent. Velarys will get back to you through the usual channels.',
    encryption: 'Your message is encrypted on this device, and only Velarys can read it.',
    listTitle: 'Your requests',
    empty: 'No request sent from this device yet.',
    noText: 'Text not kept on this device.',
    loading: 'Loading…',
    listError: 'Request status is unavailable at the moment.',
    counter: (n) => `${n.toLocaleString('en-GB')} / 2,000`,
    status: { new: 'Received', in_progress: 'In progress', closed: 'Closed' },
    outcome: { done: { assistance: 'resolved', evolution: 'done' }, declined: 'declined' },
    kind: { assistance: 'Support', evolution: 'Idea' },
    errors: {
      not_enrolled: 'This device is not linked to Velarys yet. The panel will work once the installation is complete.',
      revoked: 'Velarys monitoring has been stopped on this device.',
      empty: 'The message is empty.',
      message_too_long: 'The message is longer than 2,000 characters.',
      tickets_disabled: 'Requests are not open yet. Please contact Velarys through the usual channels.',
      rate_limited: 'Several requests have already been sent from this device today. Try again tomorrow, or contact Velarys directly.',
      unreachable: 'Velarys cannot be reached right now. Your message was not sent: try again in a few minutes.',
      default: 'The request could not be sent. Try again later, or contact Velarys directly.',
    },
    date: 'en-GB',
  },
};

const lang = (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
const t = T[lang];
document.documentElement.lang = lang;

for (const el of document.querySelectorAll('[data-t]')) {
  const value = t[el.dataset.t];
  if (typeof value === 'string') el.textContent = value;
}

const form = document.getElementById('form');
const message = document.getElementById('message');
const counter = document.getElementById('counter');
const sendBtn = document.getElementById('send');
const status = document.getElementById('status');
const list = document.getElementById('tickets');
const listStatus = document.getElementById('list-status');

const chars = (text) => [...text].length;
const kind = () => form.querySelector('input[name="kind"]:checked').value;

function updateCounter() {
  const n = chars(message.value.trim());
  counter.textContent = t.counter(n);
  counter.classList.toggle('over', n > MAX_CHARS);
}

function updatePlaceholder() {
  message.placeholder = kind() === 'assistance' ? t.placeholderAssistance : t.placeholderEvolution;
}

function setStatus(el, text, tone) {
  el.textContent = text || '';
  el.dataset.tone = tone || '';
}

function errorText(code) {
  return t.errors[code] || t.errors.default;
}

async function api(method, body) {
  const res = await fetch('api/tickets', {
    method,
    headers: body ? { 'content-type': 'application/json', 'x-velarys-panel': '1' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error('request failed'), { code: (data && data.error) || 'default' });
  return data;
}

function badge(ticket) {
  const span = document.createElement('span');
  span.className = `badge badge-${ticket.status}`;
  let label = t.status[ticket.status] || ticket.status;
  if (ticket.status === 'closed' && ticket.outcome) {
    const o = ticket.outcome === 'done' ? t.outcome.done[ticket.kind] : t.outcome.declined;
    label = `${label}, ${o}`;
  }
  span.textContent = label;
  return span;
}

function renderTickets(tickets) {
  list.replaceChildren();
  if (tickets.length === 0) {
    setStatus(listStatus, t.empty);
    return;
  }
  setStatus(listStatus, '');
  const fmt = new Intl.DateTimeFormat(t.date, { dateStyle: 'medium', timeStyle: 'short' });
  for (const ticket of tickets) {
    const li = document.createElement('li');
    li.className = 'ticket';
    const head = document.createElement('div');
    head.className = 'ticket-head';
    const meta = document.createElement('span');
    meta.className = 'ticket-meta';
    meta.textContent = `${t.kind[ticket.kind] || ticket.kind} · ${fmt.format(new Date(ticket.createdAt))}`;
    head.append(meta, badge(ticket));
    const text = document.createElement('p');
    text.className = ticket.text === null ? 'ticket-text muted' : 'ticket-text';
    // textContent, jamais innerHTML : le texte est celui du client, il n'est jamais interprété.
    text.textContent = ticket.text === null ? t.noText : ticket.text;
    li.append(head, text);
    list.append(li);
  }
}

async function refresh() {
  if (!list.children.length) setStatus(listStatus, t.loading);
  try {
    renderTickets(await api('GET'));
  } catch (error) {
    list.replaceChildren();
    setStatus(listStatus, error.code === 'not_enrolled' || error.code === 'revoked' ? errorText(error.code) : t.listError, 'warn');
  }
}

form.addEventListener('change', updatePlaceholder);
message.addEventListener('input', () => {
  updateCounter();
  if (status.dataset.tone === 'ok') setStatus(status, '');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = message.value.trim();
  if (!text) return setStatus(status, t.errors.empty, 'warn');
  if (chars(text) > MAX_CHARS) return setStatus(status, t.errors.message_too_long, 'warn');
  sendBtn.disabled = true;
  sendBtn.textContent = t.sending;
  setStatus(status, '');
  try {
    await api('POST', { kind: kind(), message: text });
    message.value = '';
    updateCounter();
    setStatus(status, t.sent, 'ok');
    await refresh();
  } catch (error) {
    setStatus(status, errorText(error.code), 'warn');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = t.send;
  }
});

updateCounter();
updatePlaceholder();
refresh();
setInterval(refresh, 60_000);
