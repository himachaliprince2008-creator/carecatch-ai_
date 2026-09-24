import { NextResponse, NextRequest } from 'next/server';

/**
 * Simple secret‑based admin authentication.
 * Expects an `Authorization: Bearer <ADMIN_API_SECRET>` header.
 * Returns a `NextResponse` with 401 on failure, otherwise `null`.
 *
 * In development / demo mode (when ADMIN_API_SECRET env variable is not set),
 * this check is bypassed so all admin routes work without a token.
 */
export function adminAuth(request: NextRequest): NextResponse | null {
  // Bypass auth when no secret is explicitly configured (dev/demo mode)
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return null;

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }
  const token = authHeader.substring('Bearer '.length).trim();
  if (token !== secret) {
    return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
  }
  return null;
}
