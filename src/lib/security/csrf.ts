import { NextRequest, NextResponse } from 'next/server';

/**
 * Generates a CSRF token and sets it as an HttpOnly cookie.
 */
export function generateCsrfToken(): { token: string; cookie: string } {
  const token = crypto.randomUUID();
  const cookie = `csrfToken=${token}; Path=/; HttpOnly; SameSite=Strict; Secure`;
  return { token, cookie };
}

/**
 * Verifies CSRF token from request cookie against token provided in header x-csrf-token.
 */
export function verifyCsrf(request: NextRequest): NextResponse | null {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, v] = c.trim().split('=');
      return [k, v];
    })
  );
  const tokenFromCookie = cookies['csrfToken'];
  const tokenFromHeader = request.headers.get('x-csrf-token');
  if (!tokenFromCookie || !tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  return null;
}
