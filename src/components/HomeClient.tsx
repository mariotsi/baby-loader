'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './HomeClient.module.css';
import ConfettiContainer, { ConfettiHandle } from './ConfettiContainer';
import FusionOverlay, { FusionOverlayHandle } from './FusionOverlay';
import BornHero from './BornHero';
import LangSwitch from './LangSwitch';
import { useLang } from './LangProvider';
import { formatLongDate } from '@/lib/birthDisplay';
import type { BirthRecord } from '@/lib/birthRecord';
import { decodeVapidKey, VapidKeyError } from '@/lib/vapid';

type Status = 'idle' | 'checking' | 'loading' | 'subscribed' | 'denied' | 'unsupported' | 'error' | 'ios-needs-install';
type IOSPushStatus = 'not-ios' | 'needs-install' | 'old-ios' | 'other-browser' | 'ready';

// Collects device details that don't require any permission prompt (unlike
// navigator.geolocation), to enrich the subscription record server-side.
// Best-effort: every field is optional and unsupported ones are just omitted.
async function collectClientDeviceHints(): Promise<Record<string, unknown>> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {};
  }

  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timezone = undefined;
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
    mozConnection?: { effectiveType?: string };
    webkitConnection?: { effectiveType?: string };
    userAgentData?: {
      getHighEntropyValues?: (hints: string[]) => Promise<Record<string, string>>;
    };
  };
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  let colorScheme: 'light' | 'dark' | undefined;
  try {
    colorScheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    colorScheme = undefined;
  }

  // Chromium's User-Agent Reduction replaces the Android model with "K" and
  // the OS version with "10" in the UA string. These high-entropy Client
  // Hints are the only way to recover the real values. Chromium-only, so the
  // API is simply absent on Safari/Firefox — hence the optional chaining.
  let chModel: string | undefined;
  let chPlatformVersion: string | undefined;
  let chFullVersion: string | undefined;
  try {
    const hints = await nav.userAgentData?.getHighEntropyValues?.([
      'model',
      'platformVersion',
      'uaFullVersion',
    ]);
    if (hints) {
      chModel = hints.model || undefined;
      chPlatformVersion = hints.platformVersion || undefined;
      chFullVersion = hints.uaFullVersion || undefined;
    }
  } catch {
    // Rejected or unsupported: fall back to whatever the UA string offers.
  }

  return {
    timezone,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    pixelRatio: window.devicePixelRatio,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    platform: nav.platform,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    touchPoints: nav.maxTouchPoints,
    colorScheme,
    connectionType: connection?.effectiveType,
    chModel,
    chPlatformVersion,
    chFullVersion,
  };
}

// When notification permission is 'denied', the fix lives in OS or browser
// settings outside the page, and the exact path differs a lot by
// platform/browser. We classify into the few distinct flows that matter;
// anything we can't confidently classify falls back to a generic message
// with no specific steps rather than risking wrong instructions.
type DeniedHelpKind = 'android' | 'ios' | 'macos-safari' | 'firefox' | 'chromium-desktop' | 'generic';

function getDeniedHelpKind(): DeniedHelpKind {
  if (typeof navigator === 'undefined') {
    return 'generic';
  }
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  // iPadOS 13+ reports a desktop Mac UA, so detect it via touch support too.
  const isIPadOS = /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS;
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  // Real Safari only: Chrome/Edge/Opera on iOS and macOS all include "Safari"
  // in their UA too, so it must be excluded explicitly.
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|EdgiOS|OPR/i.test(ua);
  const isMac = /Macintosh/.test(ua) && !isIOS;

  if (isAndroid) {
    return 'android';
  }
  if (isIOS) {
    return 'ios';
  }
  if (isMac && isSafari) {
    return 'macos-safari';
  }
  if (isFirefox) {
    return 'firefox';
  }
  // Chrome, Edge, Opera, Brave and other Chromium browsers on desktop: the
  // site-permission UI is effectively identical across all of them.
  return 'chromium-desktop';
}

// Returns 'ready' if push can be used, 'needs-install' if iOS/iPadOS Safari is
// not running as an installed PWA, 'old-ios' if the OS predates push support.
function getIOSPushStatus(): IOSPushStatus {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return 'not-ios';
  }
  const ua = navigator.userAgent;

  // iPadOS 13+ reports a desktop Mac UA, so detect it via touch support.
  const isIPadOS =
    /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS;
  if (!isIOS) {
    return 'not-ios';
  }

  // "OS 16_4" on iPhone, "Version/16.4" on the iPadOS desktop UA.
  const match = ua.match(/OS (\d+)[_.](\d+)/) || ua.match(/Version\/(\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (major < 16 || (major === 16 && minor < 4)) {
      return 'old-ios';
    }
  }

  const isInstalled =
    (navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  if (isInstalled) {
    return 'ready';
  }

  // Third-party iOS browsers cannot be installed to the Home Screen at all.
  const isThirdPartyBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isThirdPartyBrowser ? 'other-browser' : 'needs-install';
}

// Arrival date: 12 September 2026 (months are 0-indexed).
const TARGET_DATE = new Date(2026, 8, 12);

function daysUntilTarget(): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((TARGET_DATE.getTime() - today.getTime()) / 86_400_000);
}

export default function HomeClient({
  vapidPublicKey,
  birth,
}: {
  vapidPublicKey: string;
  birth: BirthRecord | null;
}) {
  const { lang, t } = useLang();
  const [status, setStatus] = useState<Status>('checking');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [message, setMessage] = useState('');
  const [iosStatus, setIosStatus] = useState<IOSPushStatus>('not-ios');
  const [deniedHelpKind, setDeniedHelpKind] = useState<DeniedHelpKind>('generic');
  const confettiHandleRef = useRef<ConfettiHandle | null>(null);
  const fusionHandleRef = useRef<FusionOverlayHandle | null>(null);
  // Starts as null: computing it during render would use the server timezone
  // and cause a hydration mismatch.
  const [daysDiff, setDaysDiff] = useState<number | null>(null);

  // Re-run exactly at the next local midnight rather than polling hourly, so
  // the counter is never up to an hour stale.
  useEffect(() => {
    if (birth) {
      // The born state shows the age instead, computed by BornHero.
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      setDaysDiff(daysUntilTarget());
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(schedule, nextMidnight.getTime() - now.getTime() + 1000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [birth]);

  // confetti is handled by ConfettiContainer via ref

  // nothing to cleanup here; ConfettiContainer cleans up itself

  // confetti removal handled imperatively in RAF loop

  const checkExistingSubscription = useCallback(async () => {
    setStatus('checking');
    const ios = getIOSPushStatus();
    setIosStatus(ios);
    setDeniedHelpKind(getDeniedHelpKind());

    if (ios === 'needs-install') {
      setStatus('ios-needs-install');
      return;
    }
    if (ios === 'old-ios' || ios === 'other-browser') {
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

    // Decode before touching the browser APIs: an invalid key would otherwise
    // surface as an opaque "applicationServerKey is not valid".
    let applicationServerKey: ArrayBuffer;
    try {
      applicationServerKey = decodeVapidKey(vapidPublicKey);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(err instanceof VapidKeyError ? err.message : t.errorVapid);
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
        applicationServerKey,
      });

      // Save to backend, include user's locale when available.
      // Prefer navigator.languages (ordered). Loop to find 'it-IT' first, then any 'en-...'.
      // Fallback to 'it-IT'. Normalize short codes when needed.
      const locale = (() => {
        if (typeof navigator === 'undefined') {
          return 'it-IT';
        }
        const langs: string[] = (navigator.languages && navigator.languages.length) ? Array.from(navigator.languages) : [navigator.language || ''];
        // Normalize and check for exact Italian (it-IT) or generic Italian
        for (const raw of langs) {
          if (!raw) {
            continue;
          }
          const s = String(raw).trim();
          if (/^it(-|$)/i.test(s)) {
            return 'it-IT';
          }
        }
        // Then prefer any en-<region>
        for (const raw of langs) {
          if (!raw) {
            continue;
          }
          const s = String(raw).trim();
          if (/^en-/i.test(s)) {
            return s;
          }
          if (/^en$/i.test(s)) {
            return 'en-US';
          }
        }
        // As a last attempt, normalize the first language if it's a two-letter code
        const first = (langs[0] || '').trim();
        if (/^[a-z]{2}$/i.test(first)) {
          const code = first.toLowerCase();
          if (code === 'it') {
            return 'it-IT';
          }
          if (code === 'en') {
            return 'en-US';
          }
          return `${code}-${code.toUpperCase()}`;
        }
        return 'it-IT';
      })();
      const deviceHints = await collectClientDeviceHints();
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, locale, deviceHints }),
      });

      if (!res.ok) {
        throw new Error(t.errorServer);
      }

      setIsSubscribed(true);
      setStatus('subscribed');
      setMessage(t.subscribeOk);
      confettiHandleRef.current?.launch();
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err.message || t.errorGeneric);
    }
  };

  const unsubscribe = async () => {
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) {
        throw new Error(t.errorNoServiceWorker);
      }

      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: Record<string, string> };
        await fetch('/api/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          // Keys prove this device owns the subscription.
          body: JSON.stringify({ endpoint, keys }),
        });
        await sub.unsubscribe();
      }

      setIsSubscribed(false);
      setStatus('idle');
      setMessage(t.unsubscribeOk);
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
          <span className={styles.dot} role="img" aria-label={t.brandAlt}>👧</span>
          Stefania &amp; Simone
        </div>
        <LangSwitch />
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        {birth ? (
          <BornHero birth={birth} onReplay={() => fusionHandleRef.current?.play()} />
        ) : (
          <>
            <div className={`${styles.tagline} fade-up fade-up-delay-1`}>
              <span className={styles.line} />
              {t.waitingTagline}
              <span className={styles.line} />
            </div>

            <h1 className={`${styles.title} fade-up fade-up-delay-2`}>
              {t.waitingTitle}<br />
              <em>{t.babyName}</em>
            </h1>

            <p className={`${styles.subtitle} fade-up fade-up-delay-3`}>
              {t.duePrefix} <strong>{formatLongDate(TARGET_DATE, lang)}</strong>.
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
                        {isPast ? t.daysLate(absDays) : t.daysLeft(absDays)}
                      </span>
                    </div>
                    {isPast && (
                      <div className={styles.countSub}>
                        {t.lateNote}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )}

        {/* Status indicator & CTA */}
        <div className={`${styles.ctaWrapper} fade-up fade-up-delay-4`}>
          {status === 'checking' && (
            <div className={styles.statusLoading}>
              <button className="btn" disabled>
                <Spinner />
                {t.checking}
              </button>
            </div>
          )}

          {status === 'ios-needs-install' && (
            <div className={styles.iosInstallCard}>
              <div className={styles.iosInstallTitle}>
                {t.iosTitle}
              </div>
              <p className={styles.iosInstallIntro}>{t.iosIntro}</p>
              <ol className={styles.iosSteps}>
                <li>
                  <span className={styles.iosStepNum}>1</span>
                  <span>
                    {t.iosStep1.before} <strong>{t.iosStep1.strong}</strong> <ShareIcon />
                    <br />
                    <span className={styles.iosStepNote}>
                      {t.iosStep1.noteBefore} <MoreIcon />, {t.iosStep1.noteAfter}
                    </span>
                  </span>
                </li>
                <li>
                  <span className={styles.iosStepNum}>2</span>
                  <span>
                    {t.iosStep2.before} <strong>{t.iosStep2.strong}</strong>
                    {t.iosStep2.after && <><br /><span className={styles.iosStepNote}>{t.iosStep2.after}</span></>}
                  </span>
                </li>
                <li>
                  <span className={styles.iosStepNum}>3</span>
                  <span>{t.iosStep3.before} <strong>{t.iosStep3.strong}</strong> {t.iosStep3.after}</span>
                </li>
                <li>
                  <span className={styles.iosStepNum}>4</span>
                  <span>{t.iosStep4}</span>
                </li>
              </ol>
            </div>
          )}

          {status === 'unsupported' && (
            <div className={`${styles.statusBadge} ${styles.warning}`}>
              <span className={styles.indicator} />
              {iosStatus === 'old-ios'
                ? t.unsupportedOldIos
                : iosStatus === 'other-browser'
                  ? t.unsupportedOtherBrowser
                  : t.unsupportedGeneric}
            </div>
          )}

          {status === 'denied' && (
            <div className={styles.iosInstallCard}>
              <div className={`${styles.statusBadge} ${styles.error}`} style={{ marginBottom: 16 }}>
                <span className={styles.indicator} />
                {t.denied}
              </div>
              <div className={styles.iosInstallTitle}>{t.deniedHelpTitle}</div>
              <p className={styles.iosInstallIntro}>{t.deniedHelp[deniedHelpKind].intro}</p>
              {t.deniedHelp[deniedHelpKind].steps.length > 0 && (
                <ol className={styles.iosSteps}>
                  {t.deniedHelp[deniedHelpKind].steps.map((step, i) => (
                    <li key={i}>
                      <span className={styles.iosStepNum}>{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {status === 'subscribed' && (
            <div className={styles.subscribedState}>
              <div className={`${styles.statusBadge} ${styles.success}`}>
                <span className={`${styles.indicator} ${styles.pulse}`} />
                {birth ? t.subscribedBorn : t.subscribedWaiting}
              </div>
              <button className="btn" onClick={unsubscribe}>
                {t.unsubscribe}
              </button>
            </div>
          )}

          {(status === 'idle' || status === 'error') && (
            <button className="btn btn-primary" onClick={subscribe}>
              <BellIcon />
              {birth ? t.subscribeBorn : t.subscribeWaiting}
            </button>
          )}

          {status === 'loading' && (
            <button className="btn" disabled>
              <Spinner />
              {t.subscribing}
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

      {birth && <FusionOverlay ref={fusionHandleRef} />}
    </main>
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

function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline', verticalAlign: 'text-bottom' }}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
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
