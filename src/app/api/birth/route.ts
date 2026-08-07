import { NextResponse } from 'next/server';
import { getBirth } from '@/lib/birth';

// The home page is served from the cache, so this must not be: it exists
// precisely to tell the client that the cached page is out of date.
export const dynamic = 'force-dynamic';

/**
 * Current birth record, or null. Public on purpose: the same data is already
 * rendered into the home page.
 */
export async function GET() {
  const birth = await getBirth();
  return NextResponse.json(birth, { headers: { 'Cache-Control': 'no-store' } });
}
