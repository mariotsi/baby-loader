# PushCast — Web Push Notifications con Next.js + Netlify + MongoDB Atlas

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
```

### 5. Genera le icone

```bash
node scripts/generate-icons.js
```

Poi converti gli SVG in PNG (usa [svgtopng.com](https://svgtopng.com)) e mettili in `public/` come:
- `public/icon-72.png`
- `public/icon-192.png`
- `public/icon-512.png`

### 6. Sviluppo locale

```bash
npm run dev
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
```

---

## Struttura Progetto

```
push-notify/
├── public/
│   ├── sw.js              # Service Worker (gestisce push)
│   ├── manifest.json      # PWA manifest
│   ├── favicon.svg
│   ├── icon-72.png        # (da generare)
│   ├── icon-192.png       # (da generare)
│   └── icon-512.png       # (da generare)
├── src/
│   ├── app/
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Homepage (/)
│   │   ├── globals.css
│   │   ├── invia/
│   │   │   └── page.tsx   # Admin send page (/invia)
│   │   └── api/
│   │       ├── subscribe/
│   │       │   └── route.ts   # POST/DELETE subscription
│   │       └── send-notification/
│   │           └── route.ts   # POST send, GET count
│   ├── components/
│   │   ├── HomeClient.tsx
│   │   ├── HomeClient.module.css
│   │   ├── InviaClient.tsx
│   │   └── InviaClient.module.css
│   └── lib/
│       └── mongodb.ts     # MongoDB singleton
├── scripts/
│   ├── generate-vapid.js  # Genera chiavi VAPID
│   └── generate-icons.js  # Genera icone SVG
├── netlify.toml
├── next.config.js
└── package.json
```

---

## API Routes

### `POST /api/subscribe`
Salva o aggiorna una subscription su MongoDB.

```json
{ "subscription": { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } } }
```

### `DELETE /api/subscribe`
Rimuove una subscription.

```json
{ "endpoint": "https://..." }
```

### `POST /api/send-notification`
Invia notifica push a tutti gli iscritti. Richiede header `x-admin-password`.

```json
{ "title": "Titolo", "body": "Testo della notifica", "url": "/" }
```

### `GET /api/send-notification`
Restituisce il numero di iscritti attivi. Richiede header `x-admin-password`.

---

## Note Sicurezza

- La pagina `/invia` è protetta da password semplice via `ADMIN_PASSWORD`
- Per produzione considera l'aggiunta di autenticazione più robusta (NextAuth, Clerk, ecc.)
- Le chiavi VAPID `PRIVATE_KEY` e `ADMIN_PASSWORD` non vanno mai committate
- MongoDB Atlas: usa un utente con permessi solo sul database `pushnotify`
