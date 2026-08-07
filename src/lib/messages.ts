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
  iosTitle: 'Per ricevere la notifica quando nascerà',
  iosIntro:
    'Apple non permette di inviare notifiche push ai siti aperti nel browser: solo i siti salvati come app sulla schermata Home possono riceverle. Aggiungi questo sito alla schermata Home per abilitarle.',
  iosStep1: {
    before: 'Tocca il pulsante',
    strong: 'Condividi',
    noteBefore: 'Se non lo vedi nella barra in basso o in alto, tocca prima i tre puntini',
    noteAfter: 'poi Condividi.',
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
  deniedHelpTitle: 'Le notifiche risultano bloccate',
  deniedHelp: {
    android: {
      intro: 'Le notifiche per Chrome sono disattivate a livello di sistema. Per riattivarle:',
      steps: [
        'Apri le Impostazioni del telefono',
        'Tocca \u201cNotifiche\u201d, poi \u201cNotifiche app\u201d',
        'Cerca e tocca \u201cChrome\u201d (se non lo vedi, tocca \u201cTutte le app\u201d)',
        'Attiva \u201cConsenti notifiche\u201d',
      ],
    },
    ios: {
      intro: 'Le notifiche per questa app sono disattivate nelle impostazioni di iOS. Per riattivarle:',
      steps: [
        'Apri Impostazioni, poi Notifiche',
        'Cerca il nome che hai dato a questa app quando l\u2019hai aggiunta alla schermata Home',
        'Attiva \u201cConsenti notifiche\u201d',
      ],
    },
    'macos-safari': {
      intro: 'Le notifiche per questo sito sono bloccate nelle impostazioni di Safari. Per riattivarle:',
      steps: [
        'Apri Safari, poi Impostazioni (o Preferenze)',
        'Vai su \u201cSiti web\u201d, poi \u201cNotifiche\u201d',
        'Trova questo sito nell\u2019elenco e scegli \u201cConsenti\u201d',
      ],
    },
    firefox: {
      intro: 'Le notifiche per questo sito sono bloccate in Firefox. Per riattivarle:',
      steps: [
        'Tocca l\u2019icona del lucchetto nella barra degli indirizzi',
        'Apri \u201cAltre informazioni\u201d \u2192 \u201cAutorizzazioni\u201d (su Android: menu \u2192 Impostazioni \u2192 Permessi sito)',
        'Imposta \u201cInvia notifiche\u201d su \u201cConsenti\u201d',
      ],
    },
    'chromium-desktop': {
      intro: 'Le notifiche per questo sito sono bloccate. Per riattivarle:',
      steps: [
        'Clicca sull\u2019icona vicino alla barra degli indirizzi (lucchetto o \u201ci\u201d)',
        'Apri \u201cAutorizzazioni sito\u201d o \u201cInformazioni sito\u201d',
        'Imposta \u201cNotifiche\u201d su \u201cConsenti\u201d',
      ],
    },
    generic: {
      intro: 'Le notifiche per questo sito sono bloccate nelle impostazioni del browser o del dispositivo.',
      steps: [] as string[],
    },
  },
  subscribedBorn: 'Notifiche attive su questo dispositivo',
  subscribedWaiting: 'Notifica della nascita attiva su questo dispositivo',
  unsubscribe: 'Disiscriviti',
  subscribeBorn: 'Clicca qui per ricevere le prossime notizie',
  subscribeWaiting: 'Clicca qui per ricevere la notifica quando nascerà',
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
  iosTitle: 'To get notified when she arrives',
  iosIntro:
    'Apple does not allow push notifications for websites open in the browser \u2014 only sites saved as an app on the Home Screen can receive them. Add this site to your Home Screen to enable them.',
  iosStep1: {
    before: 'Tap the',
    strong: 'Share',
    noteBefore: 'If you don\u2019t see it in the bottom or top bar, tap the three dots first',
    noteAfter: 'then tap Share.',
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
  deniedHelpTitle: 'Notifications are currently blocked',
  deniedHelp: {
    android: {
      intro: 'Notifications for Chrome are turned off at the system level. To turn them back on:',
      steps: [
        'Open your phone\u2019s Settings app',
        'Tap \u201cNotifications\u201d, then \u201cApp notifications\u201d',
        'Find and tap \u201cChrome\u201d (tap \u201cAll apps\u201d if you don\u2019t see it)',
        'Turn \u201cAllow notifications\u201d on',
      ],
    },
    ios: {
      intro: 'Notifications for this app are turned off in iOS settings. To turn them back on:',
      steps: [
        'Open Settings, then Notifications',
        'Find the name you gave this app when you added it to your Home Screen',
        'Turn \u201cAllow Notifications\u201d on',
      ],
    },
    'macos-safari': {
      intro: 'Notifications for this site are blocked in Safari\u2019s settings. To turn them back on:',
      steps: [
        'Open Safari, then Settings (or Preferences)',
        'Go to \u201cWebsites\u201d, then \u201cNotifications\u201d',
        'Find this site in the list and choose \u201cAllow\u201d',
      ],
    },
    firefox: {
      intro: 'Notifications for this site are blocked in Firefox. To turn them back on:',
      steps: [
        'Click the padlock icon in the address bar',
        'Open \u201cMore Information\u201d \u2192 \u201cPermissions\u201d (on Android: menu \u2192 Settings \u2192 Site permissions)',
        'Set \u201cSend Notifications\u201d to \u201cAllow\u201d',
      ],
    },
    'chromium-desktop': {
      intro: 'Notifications for this site are blocked. To turn them back on:',
      steps: [
        'Click the icon next to the address bar (padlock or \u201ci\u201d)',
        'Open \u201cSite settings\u201d or \u201cView site information\u201d',
        'Set \u201cNotifications\u201d to \u201cAllow\u201d',
      ],
    },
    generic: {
      intro: 'Notifications for this site are blocked in your browser or device settings.',
      steps: [] as string[],
    },
  },
  subscribedBorn: 'Notifications are on for this device',
  subscribedWaiting: 'The birth notification is on for this device',
  unsubscribe: 'Turn off',
  subscribeBorn: 'Click here to get the next updates',
  subscribeWaiting: 'Click here to get notified when she arrives',
  subscribing: 'Turning on...',

  subscribeOk: 'You are all set.',
  unsubscribeOk: 'Notifications turned off.',
  errorGeneric: 'Something went wrong.',
  errorServer: 'Server error',
  errorNoServiceWorker: 'Service worker not found',
  errorVapid: 'Invalid VAPID key.',
};

export const messages: Record<Lang, Messages> = { it, en };
