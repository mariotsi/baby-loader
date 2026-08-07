'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { LANG_COOKIE, type Lang } from '@/lib/i18n';
import { messages, type Messages } from '@/lib/messages';

type LangValue = {
  lang: Lang;
  t: Messages;
  setLang: (next: Lang) => void;
};

const LangContext = createContext<LangValue | null>(null);

/**
 * The language is decided on the server and handed down as `initial`, so the
 * first paint is already in the right language. This context only exists to
 * let the switch change it without a round trip.
 */
export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    // Keep the document in sync for assistive technology, which reads it from
    // the DOM rather than from React state.
    document.documentElement.lang = next;
    // A display preference, not a secret: the client writes it and the server
    // reads it back on the next request. One year, site wide.
    document.cookie = `${LANG_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
  }, []);

  const value = useMemo<LangValue>(() => ({ lang, t: messages[lang], setLang }), [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error('useLang va usato dentro <LangProvider>');
  }
  return ctx;
}
