/**
 * Presentation helpers for the "born" home state. Pure functions with no React
 * or database dependency, so the copy can be tested directly.
 */

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

/** "nata oggi", "1 giorno di vita", "12 giorni di vita". */
export function formatAge(days: number): string {
  if (days <= 0) {
    return 'nata oggi';
  }
  return `${days} ${ageLabel(days)}`;
}

/**
 * The label shown next to the big number in the countdown block, which renders
 * the count separately. Day zero has no number to show, and the subtitle right
 * above already reads "Nata il ...", so it does not repeat the word.
 */
export function ageLabel(days: number): string {
  if (days <= 0) {
    return 'oggi';
  }
  return days === 1 ? 'giorno di vita' : 'giorni di vita';
}

/** "12 settembre 2026 alle 04:35" */
export function formatBirthDatetime(birthIso: string, locale = 'it-IT'): string {
  const date = new Date(birthIso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const day = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${day} alle ${time}`;
}

/** "3,25 kg" */
export function formatWeight(weight: number, locale = 'it-IT'): string {
  if (!Number.isFinite(weight) || weight <= 0) {
    return '—';
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(weight)} kg`;
}

/** "50 cm" */
export function formatLength(lengthCm: number, locale = 'it-IT'): string {
  if (!Number.isFinite(lengthCm) || lengthCm <= 0) {
    return '—';
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(lengthCm)} cm`;
}
