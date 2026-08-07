/**
 * Presentation helpers for the "born" home state. Pure functions with no React
 * or database dependency, so the copy can be tested directly.
 *
 * `Lang` is imported as a type only: this module is loaded by the node test
 * runner, which does not resolve extensionless specifiers, and a type-only
 * import is erased before it ever reaches the loader.
 */
import type { Lang } from './i18n';

/**
 * en-GB rather than en-US: it renders "12 September 2026" and a 24 hour clock,
 * which matches the Italian version instead of switching to AM/PM.
 */
const LOCALES: Record<Lang, string> = { it: 'it-IT', en: 'en-GB' };

/** Days elapsed between two instants, counted in whole local calendar days. */
export function ageInDays(birthIso: string, now: Date = new Date()): number | null {
  const birth = new Date(birthIso);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }
  const birthDay = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - birthDay.getTime()) / 86_400_000);
  // A clock skewed behind the birth timestamp must not print "-1 giorni".
  return days < 0 ? 0 : days;
}

/**
 * The label shown next to the big number in the countdown block, which renders
 * the count separately. Day zero has no number to show, and the subtitle right
 * above already gives the date, so it does not repeat the word.
 */
export function ageLabel(days: number, lang: Lang): string {
  if (days <= 0) {
    return lang === 'en' ? 'today' : 'oggi';
  }
  if (lang === 'en') {
    return days === 1 ? 'day old' : 'days old';
  }
  return days === 1 ? 'giorno di vita' : 'giorni di vita';
}

/** "12 settembre 2026 alle 04:35" / "12 September 2026 at 04:35" */
export function formatBirthDatetime(birthIso: string, lang: Lang): string {
  const date = new Date(birthIso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const time = new Intl.DateTimeFormat(LOCALES[lang], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  const joiner = lang === 'en' ? 'at' : 'alle';
  return `${formatLongDate(date, lang)} ${joiner} ${time}`;
}

/** "12 settembre 2026" / "12 September 2026" */
export function formatLongDate(date: Date, lang: Lang): string {
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** "3,25 kg" / "3.25 kg" */
export function formatWeight(weight: number, lang: Lang): string {
  if (!Number.isFinite(weight) || weight <= 0) {
    return '—';
  }
  return `${new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 3 }).format(weight)} kg`;
}

/** "50 cm" */
export function formatLength(lengthCm: number, lang: Lang): string {
  if (!Number.isFinite(lengthCm) || lengthCm <= 0) {
    return '—';
  }
  return `${new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 0 }).format(lengthCm)} cm`;
}
