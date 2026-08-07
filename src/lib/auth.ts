import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { rateLimit } from './rateLimit';

export const SESSION_COOKIE = 'admin-session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Constant-time comparison that also fails closed when the expected value is
 * missing, so a misconfigured deploy cannot end up wide open.
 */
function safeEqual(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !provided) {
    return false;
  }
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    // Still burn a comparison so length is not leaked through timing.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

function secret(): string | undefined {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
}

function sign(value: string): string {
  return createHmac('sha256', secret()!).update(value).digest('base64url');
}

export function issueSessionToken(): string {
  const expiresAt = String(Date.now() + SESSION_TTL_MS);
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !secret()) {
    return false;
  }
  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature) {
    return false;
  }
  if (!safeEqual(signature, sign(expiresAt))) {
    return false;
  }
  return Number(expiresAt) > Date.now();
}

export function checkPassword(password: unknown): boolean {
  return typeof password === 'string' && safeEqual(password, process.env.ADMIN_PASSWORD);
}

/**
 * The signed session cookie is the only accepted credential: the raw password
 * is never sent again after login.
 */
export function isAuthorized(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions(maxAge = SESSION_TTL_MS / 1000) {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-nf-client-connection-ip') ?? 'unknown';
}

/**
 * Shared guard for admin-only routes: rate-limits by IP, then requires a
 * valid session. Returns a ready-to-return error response, or null when the
 * request is allowed through.
 */
export function adminGuard(req: NextRequest): { error: string; status: number } | null {
  if (!rateLimit(`admin:${clientIp(req)}`, 10, 60_000)) {
    return { error: 'Troppi tentativi, riprova tra un minuto', status: 429 };
  }
  if (!isAuthorized(req)) {
    return { error: 'Non autorizzato', status: 401 };
  }
  return null;
}
