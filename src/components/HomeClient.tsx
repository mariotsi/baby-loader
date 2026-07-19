'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './HomeClient.module.css';
import ConfettiContainer, { ConfettiHandle } from './ConfettiContainer';

type Status = 'idle' | 'checking' | 'loading' | 'subscribed' | 'denied' | 'unsupported' | 'error' | 'ios-needs-install';

// Returns 'supported' if iOS 16.4+ installed as PWA, 'needs-install' if iOS but not installed, 'unsupported' if old iOS
function getIOSPushStatus(): 'not-ios' | 'needs-install' | 'old-ios' | 'ready' {
  if (typeof navigator === 'undefined') return 'not-ios';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(ua.includes('CriOS') && false); // CriOS still needs PWA
  if (!isIOS) return 'not-ios';
  const match = ua.match(/OS (\d+)_(\d+)/);
  const major = match ? parseInt(match[1], 10) : 0;
  const minor = match ? parseInt(match[2], 10) : 0;
  const version = major + minor / 10;
  if (version < 16.4) return 'old-ios';
  const isInstalled = (navigator as any).standalone === true;
  return isInstalled ? 'ready' : 'needs-install';
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
}

export default function HomeClient({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [status, setStatus] = useState<Status>('checking');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [message, setMessage] = useState('');
  const [iosStatus, setIosStatus] = useState<'not-ios' | 'needs-install' | 'old-ios' | 'ready'>('not-ios');
  const confettiHandleRef = useRef<ConfettiHandle | null>(null);
  // Countdown to arrival date (12 Sept 2026)
  const targetDate = new Date(2026, 8, 12); // months are 0-indexed (8 = September)
  const [daysDiff, setDaysDiff] = useState<number>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diff = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      setDaysDiff(diff);
    };
    update();
    const timer = setInterval(update, 60 * 60 * 1000); // update hourly
    return () => clearInterval(timer);
  }, []);

  // confetti is handled by ConfettiContainer via ref

  // nothing to cleanup here; ConfettiContainer cleans up itself

  // confetti removal handled imperatively in RAF loop

  const checkExistingSubscription = useCallback(async () => {
    setStatus('checking');
    const ios = getIOSPushStatus();
    setIosStatus(ios);

    if (ios === 'needs-install') {
      setStatus('ios-needs-install');
      return;
    }
    if (ios === 'old-ios') {
      setStatus('unsupported');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setIsSubscribed(true);
          setStatus('subscribed');
          return;
        }
      }
      // if we reached here and no subscription was found, go idle so CTA shows
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        // already handled above, but ensure a sensible default
        setStatus('unsupported');
      } else {
        setStatus('idle');
      }
    } catch (e) {
      // on error, fall back to idle so the user can try to subscribe
      console.error(e);
      setStatus('idle');
    }
  }, []);

  useEffect(() => {
    checkExistingSubscription();
  }, [checkExistingSubscription]);

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      // Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Save to backend, include user's locale when available.
      // Prefer navigator.languages (ordered). Loop to find 'it-IT' first, then any 'en-...'.
      // Fallback to 'it-IT'. Normalize short codes when needed.
      const locale = (() => {
        if (typeof navigator === 'undefined') return 'it-IT';
        const langs: string[] = (navigator.languages && navigator.languages.length) ? Array.from(navigator.languages) : [navigator.language || ''];
        // Normalize and check for exact Italian (it-IT) or generic Italian
        for (const raw of langs) {
          if (!raw) continue;
          const s = String(raw).trim();
          if (/^it(-|$)/i.test(s)) return 'it-IT';
        }
        // Then prefer any en-<region>
        for (const raw of langs) {
          if (!raw) continue;
          const s = String(raw).trim();
          if (/^en-/i.test(s)) return s;
          if (/^en$/i.test(s)) return 'en-US';
        }
        // As a last attempt, normalize the first language if it's a two-letter code
        const first = (langs[0] || '').trim();
        if (/^[a-z]{2}$/i.test(first)) {
          const code = first.toLowerCase();
          if (code === 'it') return 'it-IT';
          if (code === 'en') return 'en-US';
          return `${code}-${code.toUpperCase()}`;
        }
        return 'it-IT';
      })();
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, locale }),
      });

      if (!res.ok) throw new Error('Errore dal server');

      setIsSubscribed(true);
      setStatus('subscribed');
      setMessage('Iscrizione completata con successo.');
      confettiHandleRef.current?.launch();
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err.message || 'Qualcosa è andato storto.');
    }
  };

  const unsubscribe = async () => {
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) throw new Error('Service worker non trovato');

      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }

      setIsSubscribed(false);
      setStatus('idle');
      setMessage('Disiscritto con successo.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <main className={styles.main}>
      {/* Background decorative shapes */}
      <div className={styles.grid} aria-hidden>
        <div className={`${styles.bgShape} ${styles.pink}`} aria-hidden />
        <div className={`${styles.bgShape} ${styles.mint}`} aria-hidden />
        <div className={`${styles.bgShape} ${styles.yellow}`} aria-hidden />
      </div>

      {/* Header */}
      <header className={`${styles.header} fade-up`}>
        <div className={styles.wordmark}>
          <span className={styles.dot} role="img" aria-label="bambina">👧</span>
          Stefania & Simone
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={`${styles.tagline} fade-up fade-up-delay-1`}>
          <span className={styles.line} />
          In attesa
          <span className={styles.line} />
        </div>

        <h1 className={`${styles.title} fade-up fade-up-delay-2`}>
          Stiamo aspettando<br />
          <em>Emma</em>
        </h1>

        <p className={`${styles.subtitle} fade-up fade-up-delay-3`}>
          Arrivo previsto: <strong>12 settembre 2026</strong>.
        </p>

        <div className={`${styles.countdown} fade-up fade-up-delay-3`} aria-hidden>
          {typeof daysDiff === 'number' && (() => {
            const absDays = Math.abs(daysDiff);
            const isPast = daysDiff < 0;
            return (
              <>
                <div className={styles.countTop}>
                  <span className={styles.countNum}>{absDays}</span>
                  <span className={styles.countLabel}>
                    {isPast
                      ? `${absDays === 1 ? 'giorno' : 'giorni'} in ritardo`
                      : `${absDays === 1 ? 'giorno' : 'giorni'} rimanenti`}
                  </span>
                </div>
                {isPast && (
                  <div className={styles.countSub}>
                    Se la sta prendendo comoda...
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Status indicator & CTA */}
        <div className={`${styles.ctaWrapper} fade-up fade-up-delay-4`}>
          {status === 'checking' && (
            <div className={styles.statusLoading}>
              <button className="btn" disabled>
                <Spinner />
                Controllo stato...
              </button>
            </div>
          )}

          {status === 'ios-needs-install' && (
            <div className={styles.iosInstallCard}>
              <div className={styles.iosInstallTitle}>
                <SafariIcon /> Un passaggio in più su iOS
              </div>
              <p className={styles.iosInstallIntro}>
                Safari su iPhone e iPad richiede che il sito sia aggiunto alla schermata Home per abilitare le notifiche push.
              </p>
              <ol className={styles.iosSteps}>
                <li>
                  <span className={styles.iosStepNum}>1</span>
                  <span>Tocca il pulsante <strong>Condividi</strong> <ShareIcon /> in basso nella barra di Safari</span>
                </li>
                <li>
                  <span className={styles.iosStepNum}>2</span>
                  <span>Scorri e tocca <strong>&ldquo;Aggiungi a schermata Home&rdquo;</strong></span>
                </li>
                <li>
                  <span className={styles.iosStepNum}>3</span>
                  <span>Tocca <strong>&ldquo;Aggiungi&rdquo;</strong> in alto a destra</span>
                </li>
                <li>
                  <span className={styles.iosStepNum}>4</span>
                  <span>Apri l&apos;app dalla schermata Home e attiva le notifiche</span>
                </li>
              </ol>
            </div>
          )}

          {status === 'unsupported' && (
            <div className={`${styles.statusBadge} ${styles.warning}`}>
              <span className={styles.indicator} />
              {iosStatus === 'old-ios'
                ? 'Aggiorna iOS alla versione 16.4 o superiore per le notifiche push'
                : 'Il tuo browser non supporta le notifiche push'}
            </div>
          )}

          {status === 'denied' && (
            <div className={`${styles.statusBadge} ${styles.error}`}>
              <span className={styles.indicator} />
              Permesso negato — abilita le notifiche nelle impostazioni del browser
            </div>
          )}

          {status === 'subscribed' && (
            <div className={styles.subscribedState}>
              <div className={`${styles.statusBadge} ${styles.success}`}>
                <span className={`${styles.indicator} ${styles.pulse}`} />
                Notifica della nascita attiva su questo dispositivo
              </div>
              <button className="btn" onClick={unsubscribe}>
                Disiscriviti
              </button>
            </div>
          )}

          {(status === 'idle' || status === 'error') && (
            <button className="btn btn-primary" onClick={subscribe}>
              <BellIcon />
              Ricevi notifica della nascita
            </button>
          )}

          {status === 'loading' && (
            <button className="btn" disabled>
              <Spinner />
              Attivazione...
            </button>
          )}

          {message && (
            <p className={styles.feedbackMsg}>{message}</p>
          )}
        </div>
          {/* Confetti */}
          <ConfettiContainer ref={confettiHandleRef} />
      </section>

      {/* Info cards removed as requested */}

      {/* Footer */}
      <footer className={styles.footer}>
        <span className={styles.footerText}>Stefania & Simone © {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}

function SafariIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'text-bottom' }}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'text-bottom' }}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}


function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ animation: 'spin 1s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
