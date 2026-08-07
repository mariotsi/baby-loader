'use client';

import styles from './HomeClient.module.css';
import { useLang } from './LangProvider';
import { LANGS } from '@/lib/i18n';

/**
 * Two buttons rather than a select: there are exactly two options and the
 * current one has to be visible at a glance. No flags, because a flag is a
 * country and not a language.
 */
export default function LangSwitch() {
  const { lang, t, setLang } = useLang();

  return (
    <div className={styles.langSwitch} role="group" aria-label={t.langLabel}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className={styles.langBtn}
          aria-pressed={code === lang}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
