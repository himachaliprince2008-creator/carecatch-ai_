import { NextRequest, NextResponse } from "next/server";
import { commitPipelineToDatabase } from "@/lib/data-pipeline/csv-import-pipeline";
import { adminAuth } from '@/lib/security/admin-auth';
import { verifyCsrf } from '@/lib/security/csrf';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, verifiedBy, sourceName } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows array is required for commit" }, { status: 400 });
    }

    const result = await commitPipelineToDatabase({
      rows,
      verifiedBy: verifiedBy || "Admin User",
      sourceName,
    });

    return NextResponse.json({
      success: true,
      result,
      message: `Pipeline successfully executed: ${result.committedCount} rows committed to database, ${result.skippedCount} rows skipped.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Pipeline commit failed", message: (error as Error).message },
      { status: 500 }
    );
  }
}
