'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './HomeClient.module.css';

type Status = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported' | 'error' | 'ios-needs-install';

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
  const [status, setStatus] = useState<Status>('idle');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [message, setMessage] = useState('');
  const [iosStatus, setIosStatus] = useState<'not-ios' | 'needs-install' | 'old-ios' | 'ready'>('not-ios');

  const checkExistingSubscription = useCallback(async () => {
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
        }
      }
    } catch {}
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

      // Save to backend
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      if (!res.ok) throw new Error('Errore dal server');

      setIsSubscribed(true);
      setStatus('subscribed');
      setMessage('Iscrizione completata con successo.');
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
      {/* Background grid */}
      <div className={styles.grid} aria-hidden />

      {/* Header */}
      <header className={`${styles.header} fade-up`}>
        <div className={styles.wordmark}>
          <span className={styles.dot} />
          PushCast
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={`${styles.tagline} fade-up fade-up-delay-1`}>
          <span className={styles.line} />
          Notifiche push
          <span className={styles.line} />
        </div>

        <h1 className={`${styles.title} fade-up fade-up-delay-2`}>
          Rimani sempre<br />
          <em>connesso</em>
        </h1>

        <p className={`${styles.subtitle} fade-up fade-up-delay-3`}>
          Iscriviti per ricevere aggiornamenti in tempo reale direttamente
          sul tuo dispositivo — laptop, tablet o telefono.
        </p>

        {/* Status indicator & CTA */}
        <div className={`${styles.ctaWrapper} fade-up fade-up-delay-4`}>
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
                Notifiche attive su questo dispositivo
              </div>
              <button className="btn" onClick={unsubscribe}>
                Disiscriviti
              </button>
            </div>
          )}

          {(status === 'idle' || status === 'error') && (
            <button className="btn btn-primary" onClick={subscribe}>
              <BellIcon />
              Attiva notifiche
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
      </section>

      {/* Info cards */}
      <section className={`${styles.cards} fade-up fade-up-delay-4`}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>⚡</div>
          <h3>Istantanee</h3>
          <p>Notifiche consegnate in tempo reale, anche quando il browser è in background.</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>📱</div>
          <h3>Multi-device</h3>
          <p>Funziona su Chrome, Firefox, Safari, Edge — desktop e mobile.</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>🔒</div>
          <h3>Sicure</h3>
          <p>Cifrate end-to-end tramite protocollo Web Push con chiavi VAPID.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <span className={styles.footerText}>PushCast © {new Date().getFullYear()}</span>
        <span className={styles.separator}>·</span>
        <span className={styles.footerText}>Powered by Web Push API</span>
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
