export type BirthData = {
  babyName?: string;
  weight?: number | string | null;
  lengthCm?: number | string | null;
  birthMessage?: string;
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

  const message = data.birthMessage?.trim();
  if (message) {
    // Flag the message as originally Italian for non-Italian recipients.
    body += isEn ? ` 🇮🇹 ${message}` : ` ${message}`;
  }

  return { title, body };
}
