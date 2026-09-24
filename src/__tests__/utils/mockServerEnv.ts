// src/__tests__/utils/mockServerEnv.ts
/**
 * Sets up process.env for server‑only variables used in tests.
 */
export function mockServerEnv(overrides: Record<string, string> = {}) {
  const defaults = {
    DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/testdb',
    GEMINI_API_KEY: 'test-gemini-key',
    ADMIN_API_SECRET: 'test-admin-secret',
  };
  process.env = { ...process.env, ...defaults, ...overrides } as NodeJS.ProcessEnv;
}
