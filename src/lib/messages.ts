import type { Lang } from './i18n';

/**
 * All the user-facing copy of the home page, both states. Entries that embed a
 * number or a formatted value are functions rather than templates with
 * placeholders, so plural rules and word order stay inside the language that
 * owns them.
 */
const it = {
  brandAlt: 'bambina',
  langLabel: 'Lingua',

  // Waiting state
  waitingTagline: 'In attesa',
  waitingTitle: 'Stiamo aspettando',
  babyName: 'Emma',
  duePrefix: 'Arrivo previsto:',
  daysLeft: (n: number): string => (n === 1 ? 'giorno rimanente' : 'giorni rimanenti'),
  daysLate: (n: number): string => (n === 1 ? 'giorno in ritardo' : 'giorni in ritardo'),
  lateNote: 'Se la sta prendendo comoda...',

  // Born state
  bornTagline: 'È nata',
  bornTitle: 'Benvenuta',
  bornOn: (formattedDatetime: string) => `Nata il ${formattedDatetime}`,
  weightLabel: 'Peso',
  lengthLabel: 'Lunghezza',
  replay: 'Rivedi la fusione',

  // Fusion overlay
  fusionDialogLabel: 'Video: la fusione',
  fusionCaption: 'La nostra fusione perfetta',
  unmute: 'Attiva audio',

  // Push CTA and status
  checking: 'Controllo stato...',
  iosTitle: 'Un passaggio in più su iOS',
  iosIntro:
    'Apple non permette di inviare notifiche push ai siti aperti nel browser: solo i siti salvati come app sulla schermata Home possono riceverle. Aggiungi questo sito alla schermata Home per abilitarle.',
  iosStep1: {
    before: 'Tocca il pulsante',
    strong: 'Condividi',
    alt: 'o i tre puntini',
    after: 'se non vedi Condividi nella barra in basso o in alto',
  },
  iosStep2: {
    before: 'Scorri e tocca',
    strong: '\u201cAggiungi a schermata Home\u201d',
    after: 'se non la vedi, scorri fino in fondo e tocca \u201cModifica azioni\u201d per abilitarla',
  },
  iosStep3: {
    before: 'Tocca',
    strong: '\u201cAggiungi\u201d',
    after: 'in alto a destra',
  },
  iosStep4: 'Apri l\u2019app dalla schermata Home e attiva le notifiche',
  unsupportedOldIos: 'Aggiorna iOS alla versione 16.4 o superiore per le notifiche push',
  unsupportedOtherBrowser:
    'Su iPhone e iPad le notifiche funzionano solo con Safari: riapri questa pagina in Safari',
  unsupportedGeneric: 'Il tuo browser non supporta le notifiche push',
  denied: 'Permesso negato: abilita le notifiche nelle impostazioni del browser',
  subscribedBorn: 'Notifiche attive su questo dispositivo',
  subscribedWaiting: 'Notifica della nascita attiva su questo dispositivo',
  unsubscribe: 'Disiscriviti',
  subscribeBorn: 'Ricevi le prossime notizie',
  subscribeWaiting: 'Ricevi notifica della nascita',
  subscribing: 'Attivazione...',

  // Feedback
  subscribeOk: 'Iscrizione completata con successo.',
  unsubscribeOk: 'Disiscritto con successo.',
  errorGeneric: 'Qualcosa è andato storto.',
  errorServer: 'Errore dal server',
  errorNoServiceWorker: 'Service worker non trovato',
  errorVapid: 'Chiave VAPID non valida.',
};

export type Messages = typeof it;

const en: Messages = {
  brandAlt: 'baby girl',
  langLabel: 'Language',

  waitingTagline: 'Expecting',
  waitingTitle: 'We are waiting for',
  babyName: 'Emma',
  duePrefix: 'Due date:',
  daysLeft: (n: number): string => (n === 1 ? 'day to go' : 'days to go'),
  daysLate: (n: number): string => (n === 1 ? 'day late' : 'days late'),
  lateNote: 'She is taking her time...',

  bornTagline: 'She is here',
  bornTitle: 'Welcome',
  bornOn: (formattedDatetime: string) => `Born on ${formattedDatetime}`,
  weightLabel: 'Weight',
  lengthLabel: 'Length',
  replay: 'Watch the fusion again',

  fusionDialogLabel: 'Video: the fusion',
  fusionCaption: 'Our perfect fusion',
  unmute: 'Turn on sound',

  checking: 'Checking...',
  iosTitle: 'One extra step on iOS',
  iosIntro:
    'Apple does not allow push notifications for websites open in the browser \u2014 only sites saved as an app on the Home Screen can receive them. Add this site to your Home Screen to enable them.',
  iosStep1: {
    before: 'Tap the',
    strong: 'Share',
    alt: 'or the three dots',
    after: 'if you don\u2019t see Share in the bottom or top bar',
  },
  iosStep2: {
    before: 'Scroll down and tap',
    strong: '\u201cAdd to Home Screen\u201d',
    after: 'if you don\u2019t see it, scroll to the bottom and tap \u201cEdit Actions\u201d to turn it on',
  },
  iosStep3: {
    before: 'Tap',
    strong: '\u201cAdd\u201d',
    after: 'in the top right',
  },
  iosStep4: 'Open the app from the Home Screen and turn notifications on',
  unsupportedOldIos: 'Update to iOS 16.4 or later to receive push notifications',
  unsupportedOtherBrowser:
    'On iPhone and iPad notifications only work in Safari: reopen this page in Safari',
  unsupportedGeneric: 'Your browser does not support push notifications',
  denied: 'Permission denied: turn notifications on in your browser settings',
  subscribedBorn: 'Notifications are on for this device',
  subscribedWaiting: 'The birth notification is on for this device',
  unsubscribe: 'Turn off',
  subscribeBorn: 'Get the next updates',
  subscribeWaiting: 'Get notified when she arrives',
  subscribing: 'Turning on...',

  subscribeOk: 'You are all set.',
  unsubscribeOk: 'Notifications turned off.',
  errorGeneric: 'Something went wrong.',
  errorServer: 'Server error',
  errorNoServiceWorker: 'Service worker not found',
  errorVapid: 'Invalid VAPID key.',
};

export const messages: Record<Lang, Messages> = { it, en };
