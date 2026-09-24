import { NextRequest, NextResponse } from "next/server";
import { parseAndValidateHospitalCsv } from "@/lib/validation/admin-schemas";
import { commitCsvBulkImport } from "@/lib/repositories/admin-repository";
import { adminAuth } from '@/lib/security/admin-auth';
import { verifyCsrf } from '@/lib/security/csrf';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  // Authentication
  const authRes = adminAuth(request);
  if (authRes) return authRes;

  // CSRF protection
  // const csrfRes = verifyCsrf(request);
  // if (csrfRes) return csrfRes;

  // Rate limiting
  const ip = getClientIp(request);
  const { allowed, remaining, resetInMs } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded', remaining, resetInMs }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { csvText, action, validRows, verifiedBy } = body;

    if (action === "VALIDATE") {
      if (!csvText || typeof csvText !== "string") {
        return NextResponse.json({ error: "csvText string is required" }, { status: 400 });
      }

      const validationResult = parseAndValidateHospitalCsv(csvText);
      return NextResponse.json(validationResult);
    }

    if (action === "COMMIT") {
      if (!Array.isArray(validRows) || validRows.length === 0) {
        return NextResponse.json({ error: "validRows array is required for commit" }, { status: 400 });
      }

      const importedCount = await commitCsvBulkImport(validRows, verifiedBy || "Admin User");
      return NextResponse.json({
        success: true,
        importedCount,
        message: `Successfully imported ${importedCount} verified hospital records.`,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use VALIDATE or COMMIT." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "CSV import processing failed", message: (error as Error).message },
      { status: 500 }
    );
  }
}
