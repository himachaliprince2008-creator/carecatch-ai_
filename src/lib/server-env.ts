import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  ADMIN_API_SECRET: z.string().min(1).optional(),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ADMIN_API_SECRET: process.env.ADMIN_API_SECRET,
  });
}

export function getGeminiApiKey() {
  const result = z.object({ GEMINI_API_KEY: z.string().min(1) }).safeParse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });
  if (!result.success) throw new Error("GEMINI_API_KEY is not configured.");
  return result.data.GEMINI_API_KEY;
}
