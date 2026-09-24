import "server-only";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type LogContext = Record<string, unknown>;

// Regex patterns to redact sensitive credentials, API keys, connection strings, and tokens
const SENSITIVE_PATTERNS = [
  /postgresql:\/\/[^:]+:[^@]+@[^\/\s]+/gi,
  /postgres:\/\/[^:]+:[^@]+@[^\/\s]+/gi,
  /AIza[0-9A-Za-z-_]{35}/g,
  /AQ\.[0-9A-Za-z-_]{45,}/g,
  /Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi,
  /(?:password|secret|apikey|api_key|token|access_token|key)\s*[:=]\s*["']?([^"'\s,]+)["']?/gi,
];

export function redactSensitiveData(input: unknown): unknown {
  if (typeof input === "string") {
    let sanitized = input;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED_SECRET]");
    }
    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map(redactSensitiveData);
  }

  if (typeof input === "object" && input !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("password") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("key") ||
        lowerKey.includes("token") ||
        lowerKey.includes("authorization") ||
        lowerKey.includes("cookie") ||
        lowerKey.includes("credential")
      ) {
        out[key] = "[REDACTED_SECRET]";
      } else {
        out[key] = redactSensitiveData(value);
      }
    }
    return out;
  }

  return input;
}

export function logMessage(level: LogLevel, message: string, context: LogContext = {}) {
  const isProduction = process.env.NODE_ENV === "production";
  const timestamp = new Date().toISOString();
  const safeContext = redactSensitiveData(context) as LogContext;
  const safeMessage = redactSensitiveData(message) as string;

  const logEntry = {
    timestamp,
    level,
    message: safeMessage,
    ...safeContext,
  };

  // Structured JSON format in production (Vercel log drain friendly)
  if (isProduction) {
    const formatted = JSON.stringify(logEntry);
    if (level === "error" || level === "fatal") {
      console.error(formatted);
    } else if (level === "warn") {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  } else {
    // Human-friendly in local dev
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    if (level === "error" || level === "fatal") {
      console.error(prefix, safeMessage, safeContext);
    } else if (level === "warn") {
      console.warn(prefix, safeMessage, safeContext);
    } else {
      console.log(prefix, safeMessage, safeContext);
    }
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => logMessage("debug", message, context),
  info: (message: string, context?: LogContext) => logMessage("info", message, context),
  warn: (message: string, context?: LogContext) => logMessage("warn", message, context),
  error: (message: string, context?: LogContext) => logMessage("error", message, context),
  fatal: (message: string, context?: LogContext) => logMessage("fatal", message, context),
};
