import { getMongoClient } from './mongodb';
import { mapBirthDoc, type BirthRecord } from './birthRecord';

export type { BirthRecord };

/**
 * Reads the birth record. Never throws: an unreachable database or a missing
 * document simply means the home page stays in its "waiting" state, which is
 * also what happens when the page is prerendered at build time without
 * MONGODB_URI.
 *
 * The collection is meant to hold a single record, written under `_id: 'birth'`,
 * but older documents were inserted with a generated ObjectId. Reading the most
 * recently updated one instead of matching on `_id` covers both without
 * touching the write path. Documents with no `updatedAt` sort last, so the
 * canonical record always wins.
 */
export async function getBirth(): Promise<BirthRecord | null> {
  try {
    const client = await getMongoClient();
    const doc = await client
      .db('pushnotify')
      .collection('births')
      .findOne({}, { sort: { updatedAt: -1, _id: -1 } });
    return mapBirthDoc(doc as Record<string, unknown> | null);
  } catch (err) {
    console.error('[birth] Lettura del record di nascita fallita:', err);
    return null;
  }
}
