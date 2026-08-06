import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, clientIp, issueSessionToken, sessionCookieOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  if (!rateLimit(`login:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Troppi tentativi, riprova tra un minuto' }, { status: 429 });
  }

  const { password } = await req.json().catch(() => ({ password: undefined }));

  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Password non corretta' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({ ...sessionCookieOptions(), value: issueSessionToken() });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set({ ...sessionCookieOptions(0), value: '' });
  return res;
}
