import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "AI_SERVICE_UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type StandardErrorResponse = {
  error: string;
  code: ApiErrorCode;
  requestId: string;
  timestamp: string;
  details?: unknown;
};

export class AppApiError extends Error {
  constructor(
    public message: string,
    public code: ApiErrorCode = "INTERNAL_ERROR",
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppApiError";
  }
}

export function handleApiError(error: unknown, contextName = "API_ROUTE"): NextResponse<StandardErrorResponse> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = new Date().toISOString();

  // 1. App-specific API error
  if (error instanceof AppApiError) {
    logger.warn(`AppApiError in ${contextName}: ${error.message}`, {
      code: error.code,
      requestId,
      statusCode: error.statusCode,
    });
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        requestId,
        timestamp,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // 2. Zod validation error
  if (error instanceof ZodError) {
    const issues = error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    logger.warn(`Validation failure in ${contextName}`, { requestId, issues });
    return NextResponse.json(
      {
        error: "Request validation failed. Please check the submitted fields.",
        code: "VALIDATION_ERROR",
        requestId,
        timestamp,
        details: issues,
      },
      { status: 400 }
    );
  }

  // 3. Prisma database error
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error(`Prisma DB error in ${contextName}: [${error.code}]`, {
      code: error.code,
      requestId,
    });

    if (error.code === "P2025") {
      return NextResponse.json(
        {
          error: "The requested record could not be found.",
          code: "NOT_FOUND",
          requestId,
          timestamp,
        },
        { status: 404 }
      );
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error: "A record with this unique identifier already exists.",
          code: "BAD_REQUEST",
          requestId,
          timestamp,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Database operation could not be completed safely. Falling back to cached verified records.",
        code: "DATABASE_ERROR",
        requestId,
        timestamp,
      },
      { status: 503 }
    );
  }

  // 4. Timeout / Abort errors
  if (error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("timeout"))) {
    logger.warn(`Operation timed out in ${contextName}`, { requestId });
    return NextResponse.json(
      {
        error: "The upstream service timed out. Please retry in a moment.",
        code: "TIMEOUT",
        requestId,
        timestamp,
      },
      { status: 504 }
    );
  }

  // 5. Generic unhandled error (Sanitize stack trace and credentials)
  const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
  logger.error(`Unhandled exception in ${contextName}`, {
    requestId,
    error: errorMessage,
  });

  return NextResponse.json(
    {
      error: "An internal server error occurred. Our engineering team has been alerted.",
      code: "INTERNAL_ERROR",
      requestId,
      timestamp,
    },
    { status: 500 }
  );
}
