// Panneau Velarys (ingress de l'add-on). Aucune dépendance, aucune ressource externe : tout est servi
// par l'add-on, par chemins relatifs (le Supervisor le publie sous /api/hassio_ingress/<jeton>/).
// Écrit pour des personnes peu techniques : trois grandes actions, une liste, des fenêtres simples.
'use strict';

const MAX_CHARS = 2000;
const NB = ' ';

const T = {
  fr: {
    subtitle: 'Suivi et maintenance',
    title: `Comment pouvons-nous vous aider${NB}?`,
    back: 'Vos demandes',
    notFound: 'Cette demande est introuvable.',
    justNow: 'à l’instant',
    actionsTitle: 'Que souhaitez-vous faire',
    ctaAssistance: 'Signaler un problème',
    ctaAssistanceHint: 'Quelque chose ne marche plus comme d’habitude.',
    ctaEvolution: 'Proposer une idée',
    ctaEvolutionHint: 'Un scénario, un appareil à ajouter, une pièce à équiper.',
    ctaIntervention: 'Demander une intervention',
    ctaInterventionHint: 'Autoriser Velarys à intervenir sur votre installation.',
    soon: 'Bientôt',
    followTitle: 'La lettre de Velarys',
    letterText: 'Nos chantiers et nos conseils, un e-mail par mois au plus.',
    socialsTitle: 'Nous suivre',
    letterCta: 'Recevoir la lettre',
    newTitle: { assistance: 'Signaler un problème', evolution: 'Proposer une idée' },
    newLabel: {
      assistance: `Que se passe-t-il${NB}? Depuis quand, dans quelle pièce${NB}?`,
      evolution: `Qu’aimeriez-vous que votre logement fasse de plus${NB}?`,
    },
    privacyHint: 'N’écrivez ni code d’alarme, ni mot de passe, ni adresse.',
    urgentTitle: 'Une urgence ?',
    urgentText: `Fuite d’eau, intrusion, panne de chauffage en hiver${NB}: appelez directement votre artisan ou les secours (17, 18 ou 112). Ce panneau n’est pas surveillé en permanence.`,
    cancel: 'Annuler',
    send: 'Envoyer',
    sending: 'Envoi…',
    sentTitle: 'Demande envoyée',
    sent: 'Merci. Velarys vous répond ici, ou par téléphone.',
    viewRequest: 'Voir ma demande',
    close: 'Fermer',
    encryption: 'Votre message est chiffré sur ce boîtier, et seul Velarys peut le lire.',
    listTitle: 'Vos demandes',
    empty: 'Vous n’avez encore envoyé aucune demande.',
    noOpen: 'Aucune demande en cours.',
    closedLabel: 'Terminées',
    showClosed: (n) => `Afficher les demandes terminées (${n})`,
    hideClosed: 'Masquer les demandes terminées',
    archivedLabel: `Archivées, terminées depuis plus de 90${NB}jours`,
    showArchived: (n) => `Afficher les archives (${n})`,
    hideArchived: 'Masquer les archives',
    noText: 'Texte non conservé sur ce boîtier.',
    loading: 'Chargement…',
    listError: 'Vos demandes ne peuvent pas s’afficher pour l’instant.',
    counter: (n) => `${n.toLocaleString('fr-FR')} / 2${NB}000`,
    kind: { assistance: 'Problème signalé', evolution: 'Idée proposée' },
    status: { new: 'Reçue', in_progress: 'En cours', closed: 'Terminée' },
    outcome: { done: { assistance: 'Réglée', evolution: 'Réalisée' }, declined: 'Non retenue' },
    newReply: 'Nouvelle réponse',
    you: 'Vous',
    velarys: 'Velarys',
    unverified: 'Un message n’a pas pu être vérifié : il n’est pas affiché.',
    replyLabel: 'Ajouter un message',
    closedNote: 'Cette demande est terminée. Pour autre chose, faites une nouvelle demande.',
    templates: {
      received: 'Bien reçu. Nous revenons vers vous.',
      need_details: `Pouvez-vous nous en dire un peu plus${NB}: quel appareil, dans quelle pièce, depuis quand${NB}?`,
      checking: 'Nous regardons l’état technique de votre installation.',
      will_call: 'Nous allons vous appeler pour en parler.',
      visit_needed: 'Il faut passer chez vous. Nous vous contactons pour fixer un rendez-vous.',
      fixed: 'C’est réglé. Dites-nous si le problème revient.',
      quote_coming: 'Merci pour l’idée. Nous vous préparons une proposition.',
      not_possible: 'Ce n’est pas possible pour le moment. Nous vous expliquons pourquoi de vive voix.',
    },
    errors: {
      not_enrolled: 'Ce boîtier n’est pas encore relié à Velarys. Le panneau fonctionnera une fois l’installation terminée.',
      revoked: 'Le suivi Velarys de ce boîtier est arrêté.',
      empty: 'Le message est vide.',
      message_too_long: `Le message dépasse 2${NB}000 caractères.`,
      tickets_disabled: 'Les demandes ne sont pas encore ouvertes. Contactez Velarys par téléphone ou par e-mail.',
      rate_limited: 'Plusieurs messages sont déjà partis aujourd’hui depuis ce boîtier. Réessayez demain, ou appelez Velarys.',
      ticket_closed: 'Cette demande est terminée. Faites une nouvelle demande.',
      unreachable: `Velarys est injoignable pour l’instant. Votre message n’est pas parti${NB}: réessayez dans quelques minutes.`,
      default: 'Le message n’a pas pu partir. Réessayez plus tard, ou appelez Velarys.',
    },
    date: 'fr-FR',
  },
  en: {
    subtitle: 'Monitoring and maintenance',
    title: 'How can we help you?',
    back: 'Your requests',
    notFound: 'This request cannot be found.',
    justNow: 'just now',
    actionsTitle: 'What would you like to do',
    ctaAssistance: 'Report a problem',
    ctaAssistanceHint: 'Something no longer works as usual.',
    ctaEvolution: 'Suggest an idea',
    ctaEvolutionHint: 'A scene, a device to add, a room to equip.',
    ctaIntervention: 'Request an intervention',
    ctaInterventionHint: 'Allow Velarys to work on your installation.',
    soon: 'Coming soon',
    followTitle: 'The Velarys newsletter',
    letterText: 'Our projects and tips, one email a month at most.',
    socialsTitle: 'Follow us',
    letterCta: 'Get the newsletter',
    newTitle: { assistance: 'Report a problem', evolution: 'Suggest an idea' },
    newLabel: {
      assistance: 'What is happening? Since when, in which room?',
      evolution: 'What else would you like your home to do?',
    },
    privacyHint: 'Do not write any alarm code, password or address.',
    urgentTitle: 'An emergency?',
    urgentText: 'Water leak, break-in, heating failure in winter: call your tradesperson or the emergency services (112) directly. This panel is not monitored around the clock.',
    cancel: 'Cancel',
    send: 'Send',
    sending: 'Sending…',
    sentTitle: 'Request sent',
    sent: 'Thank you. Velarys will reply here, or by phone.',
    viewRequest: 'View my request',
    close: 'Close',
    encryption: 'Your message is encrypted on this device, and only Velarys can read it.',
    listTitle: 'Your requests',
    empty: 'You have not sent any request yet.',
    noOpen: 'No request in progress.',
    closedLabel: 'Closed',
    showClosed: (n) => `Show closed requests (${n})`,
    hideClosed: 'Hide closed requests',
    archivedLabel: 'Archived, closed more than 90 days ago',
    showArchived: (n) => `Show archived requests (${n})`,
    hideArchived: 'Hide archived requests',
    noText: 'Text not kept on this device.',
    loading: 'Loading…',
    listError: 'Your requests cannot be shown right now.',
    counter: (n) => `${n.toLocaleString('en-GB')} / 2,000`,
    kind: { assistance: 'Problem reported', evolution: 'Idea suggested' },
    status: { new: 'Received', in_progress: 'In progress', closed: 'Done' },
    outcome: { done: { assistance: 'Resolved', evolution: 'Done' }, declined: 'Not taken forward' },
    newReply: 'New reply',
    you: 'You',
    velarys: 'Velarys',
    unverified: 'A message could not be verified and is not shown.',
    replyLabel: 'Add a message',
    closedNote: 'This request is closed. For anything else, please send a new request.',
    templates: {
      received: 'Received. We will get back to you.',
      need_details: 'Could you tell us a bit more: which device, which room, since when?',
      checking: 'We are looking at the technical state of your installation.',
      will_call: 'We will call you to talk it through.',
      visit_needed: 'A visit is needed. We will contact you to set a date.',
      fixed: 'It is fixed. Let us know if the problem comes back.',
      quote_coming: 'Thank you for the idea. We are preparing a proposal.',
      not_possible: 'This is not possible for now. We will explain why in person.',
    },
    errors: {
      not_enrolled: 'This device is not linked to Velarys yet. The panel will work once the installation is complete.',
      revoked: 'Velarys monitoring has been stopped on this device.',
      empty: 'The message is empty.',
      message_too_long: 'The message is longer than 2,000 characters.',
      tickets_disabled: 'Requests are not open yet. Please contact Velarys by phone or email.',
      rate_limited: 'Several messages have already been sent from this device today. Try again tomorrow, or call Velarys.',
      ticket_closed: 'This request is closed. Please send a new request.',
      unreachable: 'Velarys cannot be reached right now. Your message was not sent: try again in a few minutes.',
      default: 'The message could not be sent. Try again later, or call Velarys.',
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

const $ = (id) => document.getElementById(id);
const chars = (text) => [...text].length;
const fmtDate = new Intl.DateTimeFormat(t.date, { dateStyle: 'medium', timeStyle: 'short' });
const rtfShort = new Intl.RelativeTimeFormat(t.date, { numeric: 'auto', style: 'short' });
const rtfLong = new Intl.RelativeTimeFormat(t.date, { numeric: 'auto', style: 'long' });

/** « il y a 5 min », « hier », « il y a 10 j » : la date exacte reste au survol. */
function ago(iso) {
  const sec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(sec);
  if (abs < 45) return t.justNow;
  if (abs < 3600) return rtfShort.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return rtfShort.format(Math.round(sec / 3600), 'hour');
  if (abs < 30 * 86400) return rtfShort.format(Math.round(sec / 86400), 'day');
  if (abs < 365 * 86400) return rtfLong.format(Math.round(sec / (30 * 86400)), 'month');
  return rtfLong.format(Math.round(sec / (365 * 86400)), 'year');
}

function timeEl(iso, className) {
  const el = document.createElement('time');
  if (className) el.className = className;
  el.dateTime = iso;
  el.title = fmtDate.format(new Date(iso));
  el.textContent = ago(iso);
  return el;
}
const errorText = (code) => t.errors[code] || t.errors.default;
const SEEN_KEY = 'velarys-seen';

let tickets = [];
let loaded = false;
let openTicketId = null;

function setStatus(el, text, tone) {
  el.textContent = text || '';
  el.dataset.tone = tone || '';
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json', 'x-velarys-panel': '1' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error('request failed'), { code: (data && data.error) || 'default' });
  return data;
}

// Réponses déjà vues, pour signaler « Nouvelle réponse » : confort local, jamais indispensable.
function seen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
  } catch {
    return {};
  }
}
function markSeen(ticket) {
  try {
    const s = seen();
    s[ticket.id] = lastVelarys(ticket)?.id || null;
    localStorage.setItem(SEEN_KEY, JSON.stringify(s));
  } catch {
    /* stockage indisponible : on affiche seulement moins d'indices */
  }
}
const lastVelarys = (ticket) => [...ticket.thread].reverse().find((m) => m.author === 'velarys' && m.state === 'ok');
const hasNewReply = (ticket) => {
  const last = lastVelarys(ticket);
  return Boolean(last) && seen()[ticket.id] !== last.id;
};

function statusLabel(ticket) {
  if (ticket.status === 'closed' && ticket.outcome) {
    return ticket.outcome === 'done' ? t.outcome.done[ticket.kind] : t.outcome.declined;
  }
  return t.status[ticket.status] || ticket.status;
}

function pill(ticket) {
  const span = document.createElement('span');
  span.className = `pill pill-${ticket.status}`;
  span.textContent = statusLabel(ticket);
  return span;
}

function messageText(m) {
  if (m.template) return t.templates[m.template] || '';
  return m.text;
}

// --- Liste -------------------------------------------------------------------------------------

const CLOSED_KEY = 'velarys-show-closed';
function readShowClosed() {
  try {
    return localStorage.getItem(CLOSED_KEY) === '1';
  } catch {
    return false;
  }
}
let showClosed = readShowClosed();
/** Les archives restent repliées à chaque visite. */
let showArchived = false;

/** Une ligne du carnet : carré d'état, type et date, extrait, état en mots. */
function ticketItem(ticket) {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `row row-${ticket.status}`;
  btn.addEventListener('click', () => {
    location.hash = `#/demande/${ticket.id}`;
  });

  const mark = document.createElement('span');
  mark.className = 'row-mark';
  mark.setAttribute('aria-hidden', 'true');

  const main = document.createElement('span');
  main.className = 'row-main';

  const head = document.createElement('span');
  head.className = 'row-head';
  const kind = document.createElement('span');
  kind.className = 'row-kind';
  kind.textContent = t.kind[ticket.kind] || ticket.kind;
  head.append(kind, timeEl(ticket.createdAt, 'row-date'));

  const text = document.createElement('span');
  text.className = ticket.text === null ? 'row-text muted' : 'row-text';
  // textContent, jamais innerHTML : aucun texte n'est interprété.
  text.textContent = ticket.text === null ? t.noText : ticket.text;

  const foot = document.createElement('span');
  foot.className = 'row-foot';
  const state = document.createElement('span');
  state.className = 'row-state';
  state.textContent = statusLabel(ticket);
  foot.append(state);
  if (hasNewReply(ticket)) {
    const flag = document.createElement('span');
    flag.className = 'new-reply';
    flag.textContent = t.newReply;
    foot.append(flag);
  }
  main.append(head, text, foot);

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('viewBox', '0 0 24 24');
  chevron.setAttribute('class', 'row-go');
  chevron.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M9 6l6 6-6 6');
  chevron.append(path);

  btn.append(mark, main, chevron);
  li.append(btn);
  return li;
}

/** Ouvertes en haut du carnet ; terminées repliées dans son pied ; archivées (90 jours) à part. */
function renderList() {
  const open = tickets.filter((x) => x.status !== 'closed');
  const closed = tickets.filter((x) => x.status === 'closed' && !x.archived);
  const archived = tickets.filter((x) => x.archived);
  $('tickets').replaceChildren(...open.map(ticketItem));
  $('tickets-closed').replaceChildren(...closed.map(ticketItem));
  $('tickets-archived').replaceChildren(...archived.map(ticketItem));

  if (tickets.length === 0) setStatus($('list-status'), t.empty);
  else if (open.length === 0) setStatus($('list-status'), t.noOpen);
  else setStatus($('list-status'), '');

  const toggle = $('toggle-closed');
  toggle.hidden = closed.length === 0;
  toggle.setAttribute('aria-expanded', String(showClosed));
  toggle.classList.toggle('open', showClosed);
  $('toggle-closed-label').textContent = showClosed ? t.hideClosed : t.showClosed(closed.length);
  $('closed-wrap').hidden = !showClosed || closed.length === 0;

  const toggleArchived = $('toggle-archived');
  toggleArchived.hidden = archived.length === 0;
  toggleArchived.setAttribute('aria-expanded', String(showArchived));
  toggleArchived.classList.toggle('open', showArchived);
  $('toggle-archived-label').textContent = showArchived ? t.hideArchived : t.showArchived(archived.length);
  $('archived-wrap').hidden = !showArchived || archived.length === 0;
}

$('toggle-archived').addEventListener('click', () => {
  showArchived = !showArchived;
  renderList();
});

$('toggle-closed').addEventListener('click', () => {
  showClosed = !showClosed;
  try {
    localStorage.setItem(CLOSED_KEY, showClosed ? '1' : '0');
  } catch {
    /* sans stockage, le choix vaut pour cette visite */
  }
  renderList();
});

async function refresh() {
  if (!tickets.length) setStatus($('list-status'), t.loading);
  try {
    tickets = await api('GET', 'api/tickets');
    loaded = true;
    renderList();
    if (openTicketId) renderThread();
  } catch (error) {
    $('tickets').replaceChildren();
    $('tickets-closed').replaceChildren();
    $('tickets-archived').replaceChildren();
    $('toggle-closed').hidden = true;
    $('toggle-archived').hidden = true;
    setStatus($('list-status'), ['not_enrolled', 'revoked'].includes(error.code) ? errorText(error.code) : t.listError, 'warn');
  }
}

// --- Nouvelle demande --------------------------------------------------------------------------

let newKind = 'assistance';
let lastSentId = null;

function updateCounter() {
  const n = chars($('new-message').value.trim());
  $('new-counter').textContent = t.counter(n);
  $('new-counter').classList.toggle('over', n > MAX_CHARS);
}

function openNew(kind) {
  newKind = kind;
  $('new-title').textContent = t.newTitle[kind];
  // L'icône de la carte cliquée, pour que la fenêtre se rattache à l'action choisie.
  const icon = document.querySelector(`.action[data-kind="${kind}"] .action-icon svg`);
  $('new-icon').replaceChildren(...(icon ? [icon.cloneNode(true)] : []));
  $('new-label').textContent = t.newLabel[kind];
  $('new-message').value = '';
  setStatus($('new-status'), '');
  $('new-compose').hidden = false;
  $('new-sent').hidden = true;
  updateCounter();
  $('new-dialog').showModal();
  $('new-message').focus();
}

for (const btn of document.querySelectorAll('.action[data-kind]')) {
  if (!btn.disabled) btn.addEventListener('click', () => openNew(btn.dataset.kind));
}
$('new-message').addEventListener('input', updateCounter);

$('new-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = $('new-message').value.trim();
  if (!text) return setStatus($('new-status'), t.errors.empty, 'warn');
  if (chars(text) > MAX_CHARS) return setStatus($('new-status'), t.errors.message_too_long, 'warn');
  const send = $('new-send');
  send.disabled = true;
  send.textContent = t.sending;
  try {
    const created = await api('POST', 'api/tickets', { kind: newKind, message: text });
    lastSentId = created.id;
    // La confirmation reste dans la fenêtre : c'est là que le client regarde.
    $('new-compose').hidden = true;
    $('new-sent').hidden = false;
    $('new-view').focus();
    await refresh();
  } catch (error) {
    setStatus($('new-status'), errorText(error.code), 'warn');
  } finally {
    send.disabled = false;
    send.textContent = t.send;
  }
});

// --- Fil d'une demande -------------------------------------------------------------------------

function bubble(author, when, text, extraClass) {
  const li = document.createElement('li');
  li.className = `bubble bubble-${author}${extraClass ? ` ${extraClass}` : ''}`;
  const meta = document.createElement('span');
  meta.className = 'bubble-meta';
  meta.append(`${author === 'client' ? t.you : t.velarys} · `, timeEl(when));
  const p = document.createElement('p');
  p.textContent = text;
  li.append(meta, p);
  return li;
}

function renderThread() {
  const ticket = tickets.find((x) => x.id === openTicketId);
  for (const el of ['thread-title', 'thread-meta', 'thread', 'reply-form', 'closed-note']) $(el).hidden = !ticket;
  if (!ticket) {
    setStatus($('detail-status'), tickets.length || loaded ? t.notFound : t.loading);
    return;
  }
  setStatus($('detail-status'), '');
  $('thread-title').textContent = t.kind[ticket.kind] || ticket.kind;
  $('thread-meta').replaceChildren(timeEl(ticket.createdAt), document.createTextNode(' · '), pill(ticket));
  const list = $('thread');
  list.replaceChildren(bubble('client', ticket.createdAt, ticket.text === null ? t.noText : ticket.text, ticket.text === null ? 'muted' : ''));
  let hidden = 0;
  for (const m of ticket.thread) {
    if (m.state === 'unverified') {
      hidden += 1;
      continue;
    }
    const text = m.state === 'missing' ? t.noText : messageText(m);
    list.append(bubble(m.author, m.createdAt, text, m.state === 'missing' ? 'muted' : ''));
  }
  if (hidden) {
    const li = document.createElement('li');
    li.className = 'thread-warning';
    li.textContent = t.unverified;
    list.append(li);
  }
  const closed = ticket.status === 'closed';
  $('reply-form').hidden = closed;
  $('closed-note').hidden = !closed;
  markSeen(ticket);
  renderList();
}

// --- Vues : l'accueil, ou une demande (#/demande/<id>), sans fenêtre ---------------------------

function route() {
  const match = /^#\/demande\/([0-9a-f-]{36})$/i.exec(location.hash);
  const id = match ? match[1] : null;
  if (id !== openTicketId) {
    $('reply-message').value = '';
    setStatus($('reply-status'), '');
  }
  openTicketId = id;
  $('view-home').hidden = Boolean(id);
  $('view-detail').hidden = !id;
  if (id) renderThread();
  else renderList();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
$('back').addEventListener('click', (event) => {
  event.preventDefault();
  location.hash = '#/';
});

$('reply-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = $('reply-message').value.trim();
  if (!text) return setStatus($('reply-status'), t.errors.empty, 'warn');
  if (chars(text) > MAX_CHARS) return setStatus($('reply-status'), t.errors.message_too_long, 'warn');
  const send = $('reply-send');
  send.disabled = true;
  send.textContent = t.sending;
  try {
    await api('POST', `api/tickets/${openTicketId}/messages`, { message: text });
    $('reply-message').value = '';
    setStatus($('reply-status'), '');
    await refresh();
  } catch (error) {
    setStatus($('reply-status'), errorText(error.code), 'warn');
  } finally {
    send.disabled = false;
    send.textContent = t.send;
  }
});

// --- Fenêtres ----------------------------------------------------------------------------------

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // clic sur le fond
  });
}
$('new-view').addEventListener('click', () => {
  $('new-dialog').close();
  if (lastSentId) location.hash = `#/demande/${lastSentId}`;
});

for (const btn of document.querySelectorAll('[data-close]')) {
  btn.addEventListener('click', () => btn.closest('dialog').close());
}

route();
refresh();
// Toutes les minutes : nouvelles réponses, et les « il y a 5 min » qui vieillissent.
setInterval(refresh, 60_000);
