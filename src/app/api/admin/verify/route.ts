import { NextRequest, NextResponse } from "next/server";
import { verifyRecord, flagSuspiciousRecord } from "@/lib/repositories/admin-repository";
import { verifyRecordSchema } from "@/lib/validation/admin-schemas";
import { adminAuth } from '@/lib/security/admin-auth';
import { verifyCsrf } from '@/lib/security/csrf';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limiter';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "FLAG_SUSPICIOUS") {
      const { recordId, reason, notes } = body;
      if (!recordId) {
        return NextResponse.json({ error: "recordId is required" }, { status: 400 });
      }
      await flagSuspiciousRecord(recordId, reason || "OTHER", notes);
      return NextResponse.json({ success: true, message: "Record flagged as suspicious and queued for audit." });
    }

    const parsed = verifyRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    await verifyRecord(parsed.data);
    return NextResponse.json({
      success: true,
      message: `Record status updated to ${parsed.data.status}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Verification operation failed", message: (error as Error).message },
      { status: 500 }
    );
  }
}
