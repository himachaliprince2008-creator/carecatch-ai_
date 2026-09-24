export const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
  /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
  /system\s+override/i,
  /you\s+are\s+now\s+(?:a|an|in)\s+DAN/i,
  /bypass\s+(?:security|filter|safety)/i,
  /reveal\s+(?:system\s+prompt|api\s+key|environment\s+variables|database\s+url)/i,
  /print\s+(?:your\s+instructions|system\s+prompt|configuration)/i,
  /drop\s+table/i,
  /<script\b[^>]*>/i,
];

export function detectPromptInjection(input: string): { isSuspicious: boolean; reason?: string } {
  const sanitized = input.trim();
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      return {
        isSuspicious: true,
        reason: `Potential security override detected matching pattern: ${pattern.toString()}`,
      };
    }
  }
  return { isSuspicious: false };
}

export function sanitizeUserInput(input: string, maxLength = 500): string {
  return input
    .slice(0, maxLength)
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, "") // Remove ASCII control characters
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .trim();
}
