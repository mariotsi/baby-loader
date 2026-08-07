'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './InviaClient.module.css';
import { formatBirthNotification, type BirthData } from '@/lib/birthNotification';

type SendStatus = 'idle' | 'loading' | 'success' | 'error';

export default function InviaClient() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [notifType, setNotifType] = useState<'generic' | 'birth'>('generic');
  // birth fields
  const [babyName, setBabyName] = useState('Emma');
  const [weight, setWeight] = useState<string>('');
  const [lengthCm, setLengthCm] = useState<string>('');
  const [birthDatetime, setBirthDatetime] = useState<string>('');
  const [birthMessage, setBirthMessage] = useState<string>('Mamma, bimba (e papà) stanno bene!');
  const [birthMessageEn, setBirthMessageEn] = useState<string>('Mom, baby (and dad) are all doing well!');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [result, setResult] = useState<{ sent?: number; failed?: number; total?: number; message?: string } | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any | null>(null);
  const [hasExistingBirth, setHasExistingBirth] = useState(false);

  // Resume an existing session: the credential lives in an httpOnly cookie, so
  // it is sent automatically and is never readable from JS.
  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/send-notification');
      if (!res.ok) {
        return false;
      }
      const data = await res.json();
      setAuthed(true);
      setSubscriberCount(data.count);
      setHasExistingBirth(Boolean(data.hasBirth));
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAuthError(data.error || 'Password non corretta');
        return;
      }
      setPassword('');
      await loadStatus();
    } catch {
      setAuthError('Errore di connessione');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    // validation depending on notification type
    if (notifType === 'generic') {
      if (!title.trim() || !body.trim()) {
        return;
      }
    } else {
      if (!babyName.trim() || !weight || !lengthCm || !birthDatetime) {
        return;
      }
    }
    const payload: any = { type: notifType, url };
    if (notifType === 'generic') {
      payload.title = title.trim();
      payload.body = body.trim();
    } else {
      payload.babyName = babyName.trim();
      payload.weight = parseFloat(weight);
      payload.lengthCm = parseFloat(lengthCm);
      // convert local datetime-local value to an ISO string for server storage
      try {
        payload.birthDatetime = new Date(birthDatetime).toISOString();
      } catch (e) {
        payload.birthDatetime = birthDatetime;
      }
      payload.birthMessage = birthMessage.trim();
      payload.birthMessageEn = birthMessageEn.trim();
    }

    // For birth notifications show a confirmation modal first
    if (notifType === 'birth') {
      setPendingPayload(payload);
      setConfirmOpen(true);
      return;
    }

    // otherwise perform send immediately
    await performSend(payload);
  };

  const performSend = async (payload: any) => {
    setSendStatus('loading');
    setResult(null);
    try {
      const res = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore dal server');
      }

      setSendStatus('success');
      setResult(data);

      // if we just saved/sent a birth, mark local state accordingly
      if (payload?.type === 'birth') {
        setHasExistingBirth(true);
      }

      if (data.sent !== undefined) {
        setSubscriberCount((prev) => (prev ?? 0));
      }
    } catch (err: any) {
      setSendStatus('error');
      setResult({ message: err.message });
    }
  };

  const confirmAndSend = async () => {
    if (!pendingPayload) {
      return;
    }
    setConfirmOpen(false);
    await performSend({ ...pendingPayload, notify: true });
    setPendingPayload(null);
  };

  const overwriteOnly = async () => {
    if (!pendingPayload) {
      return;
    }
    setConfirmOpen(false);
    await performSend({ ...pendingPayload, notify: false });
    setPendingPayload(null);
    setHasExistingBirth(true);
  };

  const cancelConfirm = () => {
    setConfirmOpen(false);
    setPendingPayload(null);
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setUrl('/');
    setNotifType('generic');
    setBabyName('Emma');
    setWeight('');
    setLengthCm('');
    setBirthDatetime('');
    setBirthMessage('Mamma, bimba (e papà) stanno bene!');
    setSendStatus('idle');
    setResult(null);
  };

  const sentPreview =
    notifType === 'birth'
      ? formatBirthNotification({ babyName, weight, lengthCm, birthMessage, birthMessageEn })
      : { title, body };

  // Auth screen
  if (!authed) {
    return (
      <main className={styles.main}>
        <div className={styles.grid} aria-hidden>
          <div className={`${styles.bgShape} ${styles.pink}`} aria-hidden />
          <div className={`${styles.bgShape} ${styles.mint}`} aria-hidden />
        </div>
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
            <span className={styles.dot} role="img" aria-label="bambina">👧</span>
            Stefania & Simone
          </div>
          <Link href="/" className={styles.headerLink}>← Home</Link>
        </header>

        {/* Page title */}
        <div className={`${styles.pageTitle} fade-up fade-up-delay-1`}>
          <div className={styles.pageTitleTag}>Admin</div>
          <h1 className={styles.heading}>Invia notifica</h1>
          {subscriberCount !== null && (
            <Link href="/admin/subscriptions" className={styles.countBadge}>
              <span className={styles.countDot} />
              {subscriberCount} {subscriberCount === 1 ? 'iscritto' : 'iscritti'} attivi
            </Link>
          )}
        </div>

        {/* Form */}
        {sendStatus !== 'success' ? (
          <form onSubmit={handleSend} className={`${styles.form} fade-up fade-up-delay-2`}>
            <div className={styles.field}>
              <label className="label" htmlFor="notif-type">Tipo di notifica</label>
              <select id="notif-type" className="input" value={notifType} onChange={(e) => setNotifType(e.target.value as any)}>
                <option value="generic">Generica</option>
                <option value="birth">Nascita</option>
              </select>
            </div>

            {notifType === 'birth' && (
              <>
                <div className={styles.field}>
                  <label className="label" htmlFor="baby-name">Nome (obbligatorio)</label>
                  <input id="baby-name" className="input" value={babyName} onChange={(e) => setBabyName(e.target.value)} placeholder="es. Emma" required aria-required="true" />
                </div>
                <div className={styles.field}>
                  <label className="label" htmlFor="baby-weight">Peso (kg)</label>
                  <input id="baby-weight" className="input" type="number" step="0.001" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="3.25" />
                </div>
                <div className={styles.field}>
                  <label className="label" htmlFor="baby-length">Lunghezza (cm)</label>
                  <input id="baby-length" className="input" type="number" step="1" min="0" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} placeholder="50" />
                </div>
                <div className={styles.field}>
                  <label className="label" htmlFor="baby-datetime">Data e ora</label>
                  <input id="baby-datetime" className="input" type="datetime-local" value={birthDatetime} onChange={(e) => setBirthDatetime(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className="label" htmlFor="baby-msg">Messaggio opzionale (italiano)</label>
                  <textarea id="baby-msg" className="input" value={birthMessage} onChange={(e) => setBirthMessage(e.target.value)} placeholder="es. Mamma e papà stanno bene" />
                </div>
                <div className={styles.field}>
                  <label className="label" htmlFor="baby-msg-en">Messaggio opzionale (inglese)</label>
                  <textarea id="baby-msg-en" className="input" value={birthMessageEn} onChange={(e) => setBirthMessageEn(e.target.value)} placeholder="e.g. Mom and baby are doing well" />
                  <p className={styles.fieldHint}>Se lo lasci vuoto, chi legge in inglese vede il testo italiano con la bandierina.</p>
                </div>
              </>
            )}

            {notifType === 'generic' && (
              <>
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
              </>
            )}

            {/* Preview */}
            {(notifType === 'birth' || title || body) && (
              <NotificationPreview
                notifType={notifType}
                payload={notifType === 'birth' ? { babyName, weight, lengthCm, birthMessage, birthMessageEn } : undefined}
                title={title}
                body={body}
              />
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
                disabled={sendStatus === 'loading' || (notifType === 'generic' ? (!title.trim() || !body.trim()) : (!babyName.trim() || !weight || !lengthCm || !birthDatetime))}
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
              <strong>{sentPreview.title}</strong>
              <p>{sentPreview.body}</p>
            </div>
            <button className="btn btn-primary" onClick={resetForm}>
              Invia un&apos;altra
            </button>
          </div>
        )}
      </div>
      {confirmOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h3>Confermi invio notifica di nascita?</h3>
            </div>
            <div className={styles.modalBody}>
              <NotificationPreview notifType="birth" payload={pendingPayload ?? {}} />
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-3)' }}>{pendingPayload?.birthDatetime ? new Date(pendingPayload.birthDatetime).toLocaleString() : ''}</p>
            </div>
            <div className={styles.modalActions}>
                    <button className="btn" onClick={cancelConfirm} disabled={sendStatus === 'loading'}>Annulla</button>
                    {hasExistingBirth ? (
                      <>
                        <button className="btn" onClick={overwriteOnly} disabled={sendStatus === 'loading'}>Sovrascrivi (solo)</button>
                        <button className="btn btn-primary" onClick={confirmAndSend} disabled={sendStatus === 'loading'}>
                          {sendStatus === 'loading' ? (<><Spinner /> Invio...</>) : 'Sovrascrivi e invia'}
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-primary" onClick={confirmAndSend} disabled={sendStatus === 'loading'}>
                        {sendStatus === 'loading' ? (<><Spinner /> Invio...</>) : 'Conferma e invia'}
                      </button>
                    )}
            </div>
          </div>
        </div>
      )}
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

function NotificationPreview({ notifType, payload, title, body }: { notifType: 'generic' | 'birth'; payload?: BirthData; title?: string; body?: string }) {
  // Reuses the exact same formatter as the server, so the preview can never
  // drift from what subscribers actually receive.
  const birth = notifType === 'birth' ? formatBirthNotification(payload ?? {}) : null;
  const previewTitle = birth ? birth.title : (title || '—');
  const previewBody = birth ? birth.body : (body || '—');

  return (
    <div className={styles.preview}>
      <div className={styles.previewLabel}>Anteprima</div>
      <div className={styles.previewCard}>
        <div className={styles.previewHeader}>
          <div className={styles.previewAppIcon} />
          <span className={styles.previewAppName}>Stefania & Simone</span>
          <span className={styles.previewTime}>adesso</span>
        </div>
        <div className={styles.previewTitle}>{previewTitle}</div>
        <div className={styles.previewBody}>{previewBody}</div>
      </div>
    </div>
  );
}
