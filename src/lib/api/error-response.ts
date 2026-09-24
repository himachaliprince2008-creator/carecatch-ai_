// src/lib/api/error-response.ts
import { NextResponse } from "next/server";

/**
 * Helper to generate consistent API error responses without leaking internals.
 */
export function errorResponse(params: {
  code: string;
  message: string;
  details?: unknown;
  status?: number;
}) {
  const { code, message, details, status = 500 } = params;
  const body = { error: { code, message, ...(details !== undefined ? { details } : {}) } };
  return NextResponse.json(body, { status });
}
