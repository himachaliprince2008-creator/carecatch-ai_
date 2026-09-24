import { NextRequest, NextResponse } from "next/server";
import { getAdminHospitals, createAdminHospital } from "@/lib/repositories/admin-repository";
import { hospitalAdminFormSchema } from "@/lib/validation/admin-schemas";
import { adminAuth } from '@/lib/security/admin-auth';
import { verifyCsrf } from '@/lib/security/csrf';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limiter';

export async function GET(request: NextRequest) {
  const authRes = adminAuth(request);
  if (authRes) return authRes;

  const ip = getClientIp(request);
  const { allowed, remaining, resetInMs } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded', remaining, resetInMs }, { status: 429 });
  }

  try {
    const hospitals = await getAdminHospitals();
    return NextResponse.json(hospitals);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch admin hospitals", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Authentication
  const authRes = adminAuth(request);
  if (authRes) return authRes;

  // Rate limiting
  const ip = getClientIp(request);
  const { allowed, remaining, resetInMs } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded', remaining, resetInMs }, { status: 429 });
  }

  // CSRF protection
  // const csrfRes = verifyCsrf(request);
  // if (csrfRes) return csrfRes;

  try {
    const body = await request.json();
    const parsed = hospitalAdminFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid hospital data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const created = await createAdminHospital(parsed.data);
    return NextResponse.json({ success: true, hospital: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create hospital", message: (error as Error).message },
      { status: 500 }
    );
  }
}
