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
```

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
- La home è servita dalla cache e viene invalidata da `revalidatePath('/')` nella route
  `send-notification`, anche quando la nascita è registrata con `notify: false`. Il
  `revalidate = 60` in `page.tsx` è solo una rete di sicurezza.
- Nessuno dei due meccanismi copre le modifiche fatte direttamente sul database, tipiche
  delle prove: `revalidatePath` non viene mai chiamata e la pagina resta stantia fino
  alla scadenza. Per questo `HomeClient` interroga `GET /api/birth` a ogni visita e
  sostituisce lo stato se il database dice altro. Il primo paint arriva comunque dalla
  CDN, il controllo è asincrono e corregge la pagina in entrambe le direzioni.

Per rigenerare il video da un sorgente nuovo:

```bash
ffmpeg -i sorgente.mp4 -vf "scale=1280:-2:flags=lanczos" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 26 -preset veryslow \
  -tune animation -c:a aac -b:a 96k -movflags +faststart public/fusione.mp4
ffmpeg -i public/fusione.mp4 -frames:v 1 -vf "scale=960:-2" -q:v 6 public/fusione-poster.jpg
```

---

## API Routes

### `GET /api/birth`
Restituisce il record di nascita, oppure `null` se non c'è ancora. Pubblica di
proposito: gli stessi dati sono già nell'HTML della home. Non è mai cachata, perché
serve proprio a smentire una home cachata e stantia.

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
