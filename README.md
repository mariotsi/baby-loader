# Stefania & Simone — Web Push Notifications con Next.js + Netlify + MongoDB Atlas

Sito Next.js per inviare notifiche push a tutti i dispositivi (desktop e mobile), deployato su Netlify con MongoDB Atlas come database.

## Stack

- **Next.js 14** (App Router)
- **Netlify** (hosting + serverless functions via `@netlify/plugin-nextjs`)
- **MongoDB Atlas** (storage subscription)
- **Web Push API** + **VAPID** (notifiche cross-browser)

## Compatibilità Browser

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ | ✅ |
| Edge | ✅ | ✅ |
| Firefox | ✅ | ✅ Android |
| Safari | ✅ macOS 13+ | ✅ iOS 16.4+ |
| Opera | ✅ | ✅ |

> **Nota iOS**: Safari su iOS richiede che l'utente aggiunga il sito alla Home Screen (PWA) per ricevere notifiche push.

---

## Setup

### 1. Clona e installa

```bash
git clone <repo>
cd push-notify
npm install
```

### 2. MongoDB Atlas

1. Crea un account su [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Crea un cluster (free tier va benissimo)
3. Crea un database user con password
4. Ottieni la connection string URI
5. In **Network Access**, aggiungi `0.0.0.0/0` (allow all) per Netlify

### 3. Genera le chiavi VAPID

```bash
npm run generate-vapid
```

Copia l'output nel `.env.local`.

### 4. Crea `.env.local`

```bash
cp .env.local.example .env.local
```

Compila tutti i valori:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pushnotify
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BExamplePublicKey...
VAPID_PRIVATE_KEY=ExamplePrivateKey...
VAPID_EMAIL=mailto:tu@email.com
ADMIN_PASSWORD=unaPasswordSicura123
# Opzionale: firma il cookie di sessione admin. Se assente si usa ADMIN_PASSWORD.
SESSION_SECRET=unSegretoLungoECasuale
# Opzionale: _id (in /admin/subscriptions) della subscription del tuo device.
# Se impostato, ricevi una notifica push ogni volta che un ALTRO device si
# iscrive o cancella l'iscrizione, con link alla riga evidenziata in
# /admin/subscriptions. Senza questa variabile la funzione è semplicemente
# disattivata.
ADMIN_SUBSCRIPTION_ID=64f1a2b3c4d5e6f7a8b9c0d1
```

> **Come trovare il tuo `ADMIN_SUBSCRIPTION_ID`**: iscriviti dal tuo dispositivo, poi vai su `/admin/subscriptions`, apri la riga corrispondente al tuo device e copia il campo "ID iscrizione" nella modale.

### 5. Genera le icone

Gli SVG sorgente sono in `public/`. Per rigenerare i PNG:

```bash
npm run gen-icons
```

### 6. Sviluppo locale

```bash
npm run dev
```

Controlli disponibili:

```bash
npm run lint       # ESLint (next/core-web-vitals)
npm run typecheck  # tsc --noEmit
npm test           # test del formatter delle notifiche
```

Apri [localhost:3000](http://localhost:3000).

> **Nota**: Le notifiche push richiedono HTTPS. In locale funziona solo se accetti il certificato self-signed, o usa `ngrok` / Netlify Dev per un tunnel HTTPS.

---

## Deploy su Netlify

### Metodo 1: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Metodo 2: GitHub + Netlify UI

1. Pusha il repo su GitHub
2. Connetti il repo su [app.netlify.com](https://app.netlify.com)
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Aggiungi le variabili d'ambiente in **Site settings → Environment variables**

### Variabili d'ambiente su Netlify

Aggiungi tutte le variabili da `.env.local` nelle impostazioni Netlify:

```
MONGODB_URI
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
ADMIN_PASSWORD
SESSION_SECRET
ADMIN_SUBSCRIPTION_ID
```

---

## Struttura Progetto

```
baby-loader/
├── public/
│   ├── sw.js                  # Service Worker (gestisce push)
│   ├── manifest.json          # PWA manifest
│   ├── fusione.mp4            # Video mostrato alla prima visita dopo la nascita
│   ├── fusione-poster.jpg     # Primo frame del video
│   ├── favicon.png
│   ├── icon-72.png            # (da generare)
│   ├── icon-192.png           # (da generare)
│   └── icon-512.png           # (da generare)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Homepage (/), legge la nascita lato server
│   │   ├── globals.css        # Token colore, incluse le varianti "ink"
│   │   ├── invia/
│   │   │   └── page.tsx       # Admin send page (/invia)
│   │   └── api/
│   │       ├── admin/login/
│   │       │   └── route.ts   # POST login, DELETE logout
│   │       ├── birth/
│   │       │   └── route.ts   # GET stato nascita, sempre fresco
│   │       ├── subscribe/
│   │       │   └── route.ts   # POST/DELETE subscription
│   │       └── send-notification/
│   │           └── route.ts   # POST send, GET count
│   ├── components/
│   │   ├── HomeClient.tsx     # Sceglie fra stato "in attesa" e "nata"
│   │   ├── BornHero.tsx       # Hero dello stato "nata"
│   │   ├── FusionOverlay.tsx  # Video a schermo intero + replay
│   │   ├── ConfettiContainer.tsx
│   │   ├── InviaClient.tsx
│   │   └── *.module.css
│   └── lib/
│       ├── mongodb.ts         # Connessione lazy
│       ├── birth.ts           # Lettura del record di nascita
│       ├── birthRecord.ts     # Tipo + normalizzazione (puro)
│       ├── birthDisplay.ts    # Formattazione data/peso/età (puro)
│       ├── birthNotification.ts  # Copy della notifica di nascita
│       ├── fusion.ts          # Chiave localStorage del video
│       ├── auth.ts            # Sessione admin firmata
│       ├── push.ts            # Validazione delle subscription
│       ├── rateLimit.ts
│       └── vapid.ts
├── scripts/
│   ├── generate-vapid.js      # Genera chiavi VAPID
│   └── gen-icons.js           # Genera le icone
├── netlify.toml
├── next.config.js
└── package.json
```

---

## Stato "nata" e video della fusione

La home ha due stati, decisi lato server dal documento nella collection `births`:

- **nessun documento** → countdown alla data prevista;
- **documento presente** → nome, data e ora, peso, lunghezza, messaggio ed età in
  giorni.

Alla prima visita dopo la nascita parte `public/fusione.mp4` a schermo intero, che
sfuma e scopre i dati. Il video è mostrato **una volta per browser**, tracciato con la
chiave `localStorage` definita in `src/lib/fusion.ts`, e resta rivedibile dal pulsante
"Rivedi la fusione".

Dettagli che vale la pena conoscere prima di metterci mano:

- `page.tsx` renderizza uno **script inline** prima del primo paint. Senza, chi arriva
  per la prima volta vedrebbe per un istante i dati della bambina prima che il video li
  copra: `localStorage` è leggibile solo dopo il mount.
- Il flag "visto" è scritto **all'apertura**, non a fine video, così ricaricare a metà
  riproduzione non fa ripartire tutto.
- L'autoplay con audio viene bloccato dai browser senza un tocco precedente, quindi il
  ripiego in muto con il pulsante "Attiva audio" è il caso comune. Il replay parte da un
  click e ha sempre l'audio.
- Non c'è un pulsante "Salta", ma l'overlay **si chiude da solo** in caso di errore o di
  riproduzione che non parte: senza, una connessione instabile lascerebbe l'utente
  chiuso fuori dal sito.
- La didascalia finale **non è nel video**: è HTML, quindi bilingue. Vedi la sezione
  successiva.
- La home non è in cache: `page.tsx` dichiara `export const dynamic = 'force-dynamic'`,
  quindi legge il documento `births` a ogni richiesta. La pagina rispecchia sempre il
  database, comprese le modifiche fatte a mano durante le prove, e non serve alcuna
  invalidazione. La scelta nasce dall'internazionalizzazione, che rende impossibile
  servire un unico HTML a tutti.

Per rigenerare il video da un sorgente nuovo:

```bash
ffmpeg -i sorgente.mp4 -vf "scale=1280:-2:flags=lanczos" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 26 -preset veryslow \
  -tune animation -c:a aac -b:a 96k -movflags +faststart public/fusione.mp4
ffmpeg -i public/fusione.mp4 -frames:v 1 -vf "scale=960:-2" -q:v 6 public/fusione-poster.jpg
```

### La didascalia finale

Il sorgente generato da KlingAI conteneva, nell'ultimo secondo, una scritta illeggibile
che avrebbe dovuto dire "La nostra fusione perfetta". È stata **cancellata dal file** e
rifatta in HTML, così è anche traducibile: `fusionCaption` in `src/lib/messages.ts`.

La cancellazione approfitta del fatto che la scena è **immobile** dopo il secondo 4,175
(differenza media fra i fotogrammi: 0,67 su 255, cioè solo rumore di compressione).
Basta quindi incollare quella zona presa dall'ultimo fotogramma pulito, con i bordi
sfumati, e il rattoppo è invisibile:

```bash
# 1. il fotogramma pulito subito prima che compaia la scritta
ffmpeg -ss 3.8 -i sorgente.mp4 -vf fps=24 -frames:v 10 /tmp/f%03d.png
# 2. ritaglia da /tmp/f010.png il rettangolo (276, 562) 628x94 e salvalo come
#    patch.png in RGBA, con l'alpha sfumata di ~6px sui bordi
# 3. incollalo su ogni fotogramma dal secondo 4,18 in poi
ffmpeg -i sorgente.mp4 -i patch.png \
  -filter_complex "[0:v][1:v]overlay=276:562:enable='gte(t,4.18)'[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p \
  -profile:v high -movflags +faststart -c:a copy public/fusione.mp4
```

Il testo HTML riprende posizione, dimensione e stile di quello originale: giallo con
contorno nero, condensato corsivo maiuscolo, cap height centrata all'83,6% del
fotogramma, corpo pari al 4% della larghezza del video.

Perché resti incollato al video a **ogni** viewport, il `<video>` è avvolto da uno
`.stage` che riproduce esattamente il riquadro prodotto da `object-fit: contain`
(`min(100dvw, 100dvh * 16 / 9)` con `aspect-ratio: 16 / 9`). Senza, su schermi più
larghi di 16:9 il contenitore resterebbe largo quanto la finestra e la didascalia
scivolerebbe fuori posto. Le percentuali sono riferite a quel riquadro, quindi non
serve JavaScript per il posizionamento.

La comparsa è pilotata da `requestAnimationFrame` sul `currentTime`, non da
`timeupdate`: quest'ultimo scatta poche volte al secondo, e un ritardo di un quarto di
secondo su una didascalia così breve sarebbe visibile.

Infine, a video finito l'ultimo fotogramma **resta fermo** per `HOLD_AFTER_END_MS` prima
della dissolvenza: nel sorgente la scritta durava 0,86 secondi, troppo pochi per
leggerla.

---

## Lingua

La home è disponibile in italiano e in inglese. La lingua viene decisa dal server a
ogni richiesta, in quest'ordine:

1. il cookie `lingua` (`it` o `en`), scritto dal selettore nell'header;
2. l'header `Accept-Language` del browser, rispettando i pesi `q=`;
3. italiano.

Per questo la home è una pagina dinamica: non esiste un unico HTML da mettere in cache
per tutti. Lo stesso vale per `layout.tsx`, che deve scrivere `<html lang>` con la
lingua giusta.

I testi stanno tutti in `src/lib/messages.ts`, tipizzati in modo che una chiave mancante
in una delle due lingue faccia fallire la compilazione. Le formattazioni di data, peso e
lunghezza sono in `src/lib/birthDisplay.ts` e usano `it-IT` e `en-GB`.

Le notifiche push erano già bilingui: la lingua del destinatario viene salvata al momento
dell'iscrizione e usata da `formatBirthNotification`.

Il messaggio libero della nascita ha due campi in `/invia`, italiano e inglese. Se quello
inglese è vuoto, chi legge in inglese vede il testo italiano preceduto dalla bandierina
italiana, così sa perché la lingua è cambiata.

---

## API Routes

### `POST /api/subscribe`
Salva o aggiorna una subscription su MongoDB.

```json
{ "subscription": { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } } }
```

### `DELETE /api/subscribe`
Rimuove una subscription. Le `keys` servono come prova di possesso.

```json
{ "endpoint": "https://...", "keys": { "p256dh": "...", "auth": "..." } }
```

### `POST /api/admin/login`
Verifica `ADMIN_PASSWORD` e imposta il cookie di sessione `admin-session`
(`httpOnly`, 8h). `DELETE` sullo stesso path fa logout.

```json
{ "password": "..." }
```

### `POST /api/send-notification`
Invia notifica push a tutti gli iscritti. Richiede il cookie di sessione admin.

```json
{ "title": "Titolo", "body": "Testo della notifica", "url": "/" }
```

### `GET /api/send-notification`
Restituisce il numero di iscritti attivi. Richiede il cookie di sessione admin.

---

## Note Sicurezza

- La pagina `/invia` è protetta da password semplice via `ADMIN_PASSWORD`; il login
  crea un cookie di sessione `httpOnly` firmato (8h), che è l'unica credenziale
  accettata dalle API admin: la password non viene mai salvata nel browser né
  reinviata a ogni richiesta
- Login e API sono rate-limited per IP (best effort, in-process)
- Gli endpoint push accettati sono limitati ai domini dei push service ufficiali,
  per evitare che il server venga usato come proxy HTTP (SSRF)
- Per produzione considera l'aggiunta di autenticazione più robusta (NextAuth, Clerk, ecc.)
- Le chiavi VAPID `PRIVATE_KEY` e `ADMIN_PASSWORD` non vanno mai committate
- MongoDB Atlas: usa un utente con permessi solo sul database `pushnotify`
