// src/lib/retry.ts
/**
 * Generic retry utility with exponential backoff.
 * Used for external calls (Gemini API, database queries) to improve resilience.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delayMs?: number; factor?: number } = {}
): Promise<T> {
  const { attempts = 3, delayMs = 200, factor = 2 } = options;
  let attempt = 0;
  let lastError: unknown;
  while (attempt < attempts) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt >= attempts) break;
      const wait = delayMs * Math.pow(factor, attempt - 1);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  throw lastError;
}
