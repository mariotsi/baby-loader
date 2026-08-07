import type { Lang } from './i18n';

export type BirthData = {
  babyName?: string;
  weight?: number | string | null;
  lengthCm?: number | string | null;
  birthMessage?: string;
  birthMessageEn?: string;
};

/** Accepts comma or dot as decimal separator. */
export function parseNumber(v: unknown): number {
  if (v === undefined || v === null || v === '') {
    return NaN;
  }
  if (typeof v === 'number') {
    return v;
  }
  return Number(String(v).trim().replace(/,/g, '.'));
}

function formatNumber(value: unknown, locale: string, maximumFractionDigits: number): string {
  const n = parseNumber(value);
  if (Number.isNaN(n)) {
    return '—';
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(n);
}

/**
 * The same rule in the notification and on the page: the English text when the
 * parents wrote one, otherwise the Italian one prefixed with its flag, so an
 * English reader understands why the language just changed.
 */
export function localizedBirthMessage(
  lang: Lang,
  italian: string | undefined,
  english: string | undefined
): string {
  const it = italian?.trim() ?? '';
  const en = english?.trim() ?? '';
  if (lang !== 'en') {
    return it;
  }
  if (en) {
    return en;
  }
  return it ? `\u{1F1EE}\u{1F1F9} ${it}` : '';
}

/**
 * Single source of truth for the birth notification copy. Used by the API when
 * sending pushes and by the admin UI previews, so they can no longer diverge.
 */
export function formatBirthNotification(data: BirthData, locale = 'it-IT') {
  const isEn = /^en/i.test(locale);
  const weightText = formatNumber(data.weight, locale, 3);
  const lengthText = formatNumber(data.lengthCm, locale, 0);
  const name = data.babyName?.trim();

  const title = isEn
    ? name ? `It's a girl, ${name}!` : `It's a girl!`
    : name ? `È nata ${name}!` : 'È nata!';

  let body = isEn
    ? `Weighs ${weightText} kg and is ${lengthText} cm long.`
    : `Pesa ${weightText} kg ed è lunga ${lengthText} cm.`;

  const message = localizedBirthMessage(isEn ? 'en' : 'it', data.birthMessage, data.birthMessageEn);
  if (message) {
    body += ` ${message}`;
  }

  return { title, body };
}
