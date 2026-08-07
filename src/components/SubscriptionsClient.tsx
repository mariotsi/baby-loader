'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './SubscriptionsClient.module.css';
import type { DeviceInfo } from '@/lib/deviceInfo';
import type { GeoLocation } from '@/lib/geoip';

interface SubscriptionRow {
  id: string;
  locale: string | null;
  ip: string | null;
  device: DeviceInfo | null;
  location: GeoLocation | null;
  createdAt: string | null;
  updatedAt: string | null;
  isAdmin: boolean;
}

type SortKey = 'locale' | 'location' | 'device' | 'createdAt';
type SortDir = 'asc' | 'desc';

function locationLabel(loc: GeoLocation | null): string {
  if (!loc) {
    return '—';
  }
  return [loc.city, loc.country].filter(Boolean).join(', ') || '—';
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SubscriptionsClient() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');

  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [selected, setSelected] = useState<SubscriptionRow | null>(null);

  const highlightRef = useRef<HTMLTableRowElement | null>(null);
  const hasScrolledToHighlight = useRef(false);

  // Resume an existing session: the credential lives in an httpOnly cookie, so
  // it is sent automatically and is never readable from JS.
  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (!res.ok) {
        if (res.status === 401) {
          setAuthed(false);
        }
        return false;
      }
      const data = await res.json();
      setAuthed(true);
      setSubscriptions(data.subscriptions || []);
      return true;
    } catch {
      setListError('Errore di connessione');
      return false;
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Scroll to + flash the highlighted row once, the first time it appears.
  useEffect(() => {
    if (highlightId && highlightRef.current && !hasScrolledToHighlight.current) {
      hasScrolledToHighlight.current = true;
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId, subscriptions]);

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
      await loadList();
    } catch {
      setAuthError('Errore di connessione');
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const sorted = useMemo(() => {
    const items = [...subscriptions];
    const dir = sortDir === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'locale':
          av = a.locale || '';
          bv = b.locale || '';
          break;
        case 'location':
          av = locationLabel(a.location);
          bv = locationLabel(b.location);
          break;
        case 'device':
          av = a.device?.label || '';
          bv = b.device?.label || '';
          break;
        case 'createdAt':
        default:
          av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
      }
      if (av < bv) {
        return -1 * dir;
      }
      if (av > bv) {
        return 1 * dir;
      }
      return 0;
    });
    return items;
  }, [subscriptions, sortKey, sortDir]);

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '');

  // Auth screen — identical flow to /invia, since it shares the same session cookie.
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

          <Link href="/invia" className={styles.backLink}>
            ← Torna a Invia notifica
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.grid} aria-hidden />

      <div className={styles.wrapper}>
        <header className={`${styles.header} fade-up`}>
          <div className={styles.wordmark}>
            <span className={styles.dot} role="img" aria-label="bambina">👧</span>
            Stefania & Simone
          </div>
          <Link href="/invia" className={styles.headerLink}>← Invia notifica</Link>
        </header>

        <div className={`${styles.pageTitle} fade-up fade-up-delay-1`}>
          <div className={styles.pageTitleTag}>Admin</div>
          <h1 className={styles.heading}>Iscrizioni</h1>
          <p className={styles.countBadge}>
            <span className={styles.countDot} />
            {subscriptions.length} {subscriptions.length === 1 ? 'iscritto' : 'iscritti'} totali
          </p>
        </div>

        {listError && <div className={styles.errorMsg}>⚠ {listError}</div>}

        {loadingList ? (
          <p className={styles.emptyState}>Caricamento…</p>
        ) : sorted.length === 0 ? (
          <p className={styles.emptyState}>Nessun iscritto ancora.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort('locale')}>Lingua {sortArrow('locale')}</th>
                  <th onClick={() => toggleSort('location')}>Location {sortArrow('location')}</th>
                  <th onClick={() => toggleSort('device')}>Device {sortArrow('device')}</th>
                  <th onClick={() => toggleSort('createdAt')}>Attivata il {sortArrow('createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((sub) => {
                  const isHighlighted = sub.id === highlightId;
                  return (
                    <tr
                      key={sub.id}
                      ref={isHighlighted ? highlightRef : undefined}
                      className={`${styles.row} ${isHighlighted ? styles.highlighted : ''}`}
                      onClick={() => setSelected(sub)}
                    >
                      <td>{sub.locale || '—'}</td>
                      <td>{locationLabel(sub.location)}</td>
                      <td>
                        {sub.device?.label || '—'}
                        {sub.isAdmin && <span className={styles.adminTag}>Tu</span>}
                      </td>
                      <td>{formatDate(sub.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return (
    <div className={styles.detailField}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

function DetailModal({ item, onClose }: { item: SubscriptionRow; onClose: () => void }) {
  const d = item.device;
  const loc = item.location;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Dettagli iscrizione{item.isAdmin ? ' (tu)' : ''}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Chiudi">✕</button>
        </div>

        <div className={styles.modalBody}>
          <section className={styles.detailSection}>
            <h4>Generale</h4>
            <Field label="ID iscrizione" value={item.id} />
            <Field label="Lingua" value={item.locale} />
            <Field label="Indirizzo IP" value={item.ip} />
            <Field label="Iscritto il" value={formatDate(item.createdAt)} />
            <Field label="Ultimo aggiornamento" value={formatDate(item.updatedAt)} />
          </section>

          {d && (
            <section className={styles.detailSection}>
              <h4>Dispositivo</h4>
              <Field label="Riepilogo" value={d.label} />
              <Field label="Sistema operativo" value={[d.os.name, d.os.version].filter(Boolean).join(' ')} />
              {d.osVersionFrozen && (
                <Field label="Nota" value="Apple nasconde la versione esatta di iOS a partire da iOS 26" />
              )}
              <Field label="Browser" value={[d.browser.name, d.browser.version].filter(Boolean).join(' ')} />
              <Field label="Motore" value={d.engine} />
              <Field label="Tipo dispositivo" value={d.deviceType} />
              <Field label="Produttore" value={d.vendor} />
              <Field label="Modello" value={d.model} />
              <Field label="Modello stimato" value={d.modelGuess} />
              <Field label="Fuso orario" value={d.timezone} />
              <Field label="Piattaforma" value={d.platform} />
              <Field
                label="Schermo"
                value={d.screen ? `${d.screen.width}×${d.screen.height} @${d.screen.pixelRatio}x` : null}
              />
              <Field label="Viewport" value={d.viewport ? `${d.viewport.width}×${d.viewport.height}` : null} />
              <Field label="CPU (core logici)" value={d.hardwareConcurrency} />
              <Field label="Memoria stimata (GB)" value={d.deviceMemory} />
              <Field label="Punti touch" value={d.touchPoints} />
              <Field label="Tema preferito" value={d.colorScheme} />
              <Field label="Tipo di connessione" value={d.connectionType} />
              <Field label="User-Agent" value={d.ua} />
            </section>
          )}

          {loc && (
            <section className={styles.detailSection}>
              <h4>Posizione (da IP)</h4>
              <Field label="Città" value={loc.city} />
              <Field label="Regione" value={[loc.region, loc.regionCode].filter(Boolean).join(' · ')} />
              <Field
                label="Paese"
                value={[loc.country, loc.countryCode].filter(Boolean).join(' · ')}
              />
              <Field label="Continente" value={loc.continentCode} />
              <Field label="In UE" value={loc.inEu === null ? null : loc.inEu ? 'Sì' : 'No'} />
              <Field label="CAP" value={loc.postal} />
              <Field label="Coordinate" value={loc.lat !== null && loc.lon !== null ? `${loc.lat}, ${loc.lon}` : null} />
              <Field label="Fuso orario" value={loc.timezone} />
              <Field label="Offset UTC" value={loc.utcOffset} />
              <Field label="Prefisso telefonico" value={loc.callingCode} />
              <Field label="Valuta" value={[loc.currency, loc.currencyName].filter(Boolean).join(' · ')} />
              <Field label="Lingue del paese" value={loc.languages} />
              <Field label="Rete (ASN)" value={loc.asn} />
              <Field label="Provider" value={loc.org} />
            </section>
          )}

          {!d && !loc && (
            <p className={styles.detailEmpty}>
              Nessun dato aggiuntivo disponibile per questa iscrizione (creata prima di questa funzione).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
