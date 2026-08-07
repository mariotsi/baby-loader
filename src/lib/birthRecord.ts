/**
 * The birth record as it crosses the server/client boundary: `birthDatetime` is
 * an ISO string rather than a Date so it survives serialization into the client
 * component without relying on Next's Date support.
 *
 * Kept free of any database import so the mapping stays unit-testable without
 * pulling in the Mongo driver.
 */
export type BirthRecord = {
  babyName: string;
  weight: number;
  lengthCm: number;
  birthMessage: string;
  birthDatetime: string;
};

/**
 * Normalizes the raw Mongo document. Returns null when the record is unusable
 * so a half-written document can never render a broken "born" page.
 */
export function mapBirthDoc(doc: Record<string, unknown> | null | undefined): BirthRecord | null {
  if (!doc) {
    return null;
  }

  const babyName = typeof doc.babyName === 'string' ? doc.babyName.trim() : '';
  if (!babyName) {
    return null;
  }

  const raw = doc.birthDatetime;
  const date = raw instanceof Date ? raw : new Date(String(raw ?? ''));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const weight = Number(doc.weight);
  const lengthCm = Number(doc.lengthCm);

  return {
    babyName,
    weight: Number.isFinite(weight) ? weight : 0,
    lengthCm: Number.isFinite(lengthCm) ? lengthCm : 0,
    birthMessage: typeof doc.birthMessage === 'string' ? doc.birthMessage.trim() : '',
    birthDatetime: date.toISOString(),
  };
}
