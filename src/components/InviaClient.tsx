'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './InviaClient.module.css';

type SendStatus = 'idle' | 'loading' | 'success' | 'error';

export default function InviaClient() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [result, setResult] = useState<{ sent?: number; failed?: number; total?: number; message?: string } | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  const storedPassword = typeof window !== 'undefined' ? sessionStorage.getItem('admin-pw') : null;

  useEffect(() => {
    if (storedPassword) {
      verifyPassword(storedPassword);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyPassword = async (pw: string) => {
    try {
      const res = await fetch('/api/send-notification', {
        headers: { 'x-admin-password': pw },
      });
      if (res.ok) {
        setAuthed(true);
        sessionStorage.setItem('admin-pw', pw);
        const data = await res.json();
        setSubscriberCount(data.count);
      } else {
        setAuthError('Password non corretta');
      }
    } catch {
      setAuthError('Errore di connessione');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    await verifyPassword(password);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSendStatus('loading');
    setResult(null);

    try {
      const pw = sessionStorage.getItem('admin-pw') || password;
      const res = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': pw,
        },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Errore dal server');

      setSendStatus('success');
      setResult(data);

      if (data.sent !== undefined) {
        setSubscriberCount((prev) => (prev ?? 0));
      }
    } catch (err: any) {
      setSendStatus('error');
      setResult({ message: err.message });
    }
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setUrl('/');
    setSendStatus('idle');
    setResult(null);
  };

  // Auth screen
  if (!authed) {
    return (
      <main className={styles.main}>
        <div className={styles.grid} aria-hidden />
        <div className={`${styles.authCard} fade-up`}>
          <div className={styles.authIcon}>🔐</div>
          <h1 className={styles.authTitle}>Area riservata</h1>
          <p className={styles.authSub}>Inserisci la password admin per accedere</p>

          <form onSubmit={handleAuth} className={styles.authForm}>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                autoFocus
              />
            </div>
            {authError && <p className={styles.authError}>{authError}</p>}
            <button type="submit" className="btn btn-primary btn-full">
              Accedi
            </button>
          </form>

          <Link href="/" className={styles.backLink}>
            ← Torna alla home
          </Link>
        </div>
      </main>
    );
  }

  // Send screen
  return (
    <main className={styles.main}>
      <div className={styles.grid} aria-hidden />

      <div className={styles.wrapper}>
        {/* Header */}
        <header className={`${styles.header} fade-up`}>
          <div className={styles.wordmark}>
            <span className={styles.dot} />
            PushCast
          </div>
          <Link href="/" className={styles.headerLink}>← Home</Link>
        </header>

        {/* Page title */}
        <div className={`${styles.pageTitle} fade-up fade-up-delay-1`}>
          <div className={styles.pageTitleTag}>Admin</div>
          <h1 className={styles.heading}>Invia notifica</h1>
          {subscriberCount !== null && (
            <p className={styles.countBadge}>
              <span className={styles.countDot} />
              {subscriberCount} {subscriberCount === 1 ? 'iscritto' : 'iscritti'} attivi
            </p>
          )}
        </div>

        {/* Form */}
        {sendStatus !== 'success' ? (
          <form onSubmit={handleSend} className={`${styles.form} fade-up fade-up-delay-2`}>
            <div className={styles.field}>
              <label className="label" htmlFor="notif-title">
                Titolo
              </label>
              <input
                id="notif-title"
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="es. Nuovo aggiornamento disponibile"
                maxLength={100}
                required
              />
              <span className={styles.charCount}>{title.length}/100</span>
            </div>

            <div className={styles.field}>
              <label className="label" htmlFor="notif-body">
                Testo
              </label>
              <textarea
                id="notif-body"
                className="input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Scrivi il contenuto della notifica..."
                maxLength={300}
                required
              />
              <span className={styles.charCount}>{body.length}/300</span>
            </div>

            <div className={styles.field}>
              <label className="label" htmlFor="notif-url">
                URL destinazione (opzionale)
              </label>
              <input
                id="notif-url"
                type="text"
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/"
              />
              <span className={styles.fieldHint}>
                URL aperto al click sulla notifica
              </span>
            </div>

            {/* Preview */}
            {(title || body) && (
              <div className={styles.preview}>
                <div className={styles.previewLabel}>Anteprima</div>
                <div className={styles.previewCard}>
                  <div className={styles.previewHeader}>
                    <div className={styles.previewAppIcon} />
                    <span className={styles.previewAppName}>PushCast</span>
                    <span className={styles.previewTime}>adesso</span>
                  </div>
                  <div className={styles.previewTitle}>{title || '—'}</div>
                  <div className={styles.previewBody}>{body || '—'}</div>
                </div>
              </div>
            )}

            {sendStatus === 'error' && result?.message && (
              <div className={styles.errorMsg}>
                ⚠ {result.message}
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendStatus === 'loading' || !title.trim() || !body.trim()}
              >
                {sendStatus === 'loading' ? (
                  <>
                    <Spinner />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <SendIcon />
                    Invia a tutti
                    {subscriberCount !== null && ` (${subscriberCount})`}
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Success state */
          <div className={`${styles.successState} fade-up`}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.successTitle}>Notifiche inviate</h2>
            <div className={styles.successStats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{result?.sent ?? 0}</span>
                <span className={styles.statLabel}>Consegnate</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>{result?.failed ?? 0}</span>
                <span className={styles.statLabel}>Fallite</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>{result?.total ?? 0}</span>
                <span className={styles.statLabel}>Totale</span>
              </div>
            </div>
            <div className={styles.successPreview}>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
            <button className="btn btn-primary" onClick={resetForm}>
              Invia un'altra
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
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
