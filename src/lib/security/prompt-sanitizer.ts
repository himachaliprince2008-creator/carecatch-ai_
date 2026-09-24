// src/lib/security/prompt-sanitizer.ts
/**
 * Basic prompt sanitization to mitigate prompt injection attacks.
 * - Trims whitespace
 * - Limits length to 500 characters (configurable)
 * - Removes potentially dangerous characters/strings
 * - Escapes backticks and dollar braces that could be interpreted by template literals
 */
export function sanitizePrompt(input: string, maxLength = 500): string {
  // Trim and enforce length
  let sanitized = input.trim().slice(0, maxLength);
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");
  // Basic blacklist patterns (can be extended)
  const blacklist = [
    /`/g, // backticks
    /\$\{/g, // ${
    /\bSELECT\b/i,
    /\bINSERT\b/i,
    /\bUPDATE\b/i,
    /\bDELETE\b/i,
    /\bDROP\b/i,
    /\bUNION\b/i,
    /\b--\b/, // comment
  ];
  for (const pattern of blacklist) {
    sanitized = sanitized.replace(pattern, "");
  }
  return sanitized;
}
