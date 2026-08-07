'use client';

import { useEffect, useState } from 'react';
import styles from './HomeClient.module.css';
import type { BirthRecord } from '@/lib/birthRecord';
import {
  ageInDays,
  ageLabel,
  formatBirthDatetime,
  formatLength,
  formatWeight,
} from '@/lib/birthDisplay';

export default function BornHero({ birth, onReplay }: { birth: BirthRecord; onReplay: () => void }) {
  // Starts as null: computing it during render would use the server timezone
  // and cause a hydration mismatch.
  const [age, setAge] = useState<number | null>(null);

  // Re-run exactly at the next local midnight rather than polling, so the
  // counter is never stale.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      setAge(ageInDays(birth.birthDatetime));
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(schedule, nextMidnight.getTime() - now.getTime() + 1000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [birth.birthDatetime]);

  return (
    <>
      <div className={`${styles.tagline} fade-up fade-up-delay-1`}>
        <span className={styles.line} />
        È nata
        <span className={styles.line} />
      </div>

      <h1 className={`${styles.title} fade-up fade-up-delay-2`}>
        Benvenuta<br />
        <em>{birth.babyName}</em>
      </h1>

      <p className={`${styles.subtitle} fade-up fade-up-delay-3`}>
        Nata il {formatBirthDatetime(birth.birthDatetime)}
      </p>

      <div className={`${styles.countdown} fade-up fade-up-delay-3`}>
        {age !== null && (
          <div className={styles.countTop}>
            {age > 0 && <span className={styles.countNum}>{age}</span>}
            <span className={styles.countLabel}>{ageLabel(age)}</span>
          </div>
        )}
      </div>

      <dl className={`${styles.stats} fade-up fade-up-delay-3`}>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Peso</dt>
          <dd className={styles.statValue}>{formatWeight(birth.weight)}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Lunghezza</dt>
          <dd className={styles.statValue}>{formatLength(birth.lengthCm)}</dd>
        </div>
      </dl>

      {birth.birthMessage && (
        <p className={`${styles.birthMessage} fade-up fade-up-delay-4`}>{birth.birthMessage}</p>
      )}

      <button type="button" className={`btn ${styles.replayBtn} fade-up fade-up-delay-4`} onClick={onReplay}>
        <PlayIcon />
        Rivedi la fusione
      </button>
    </>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
