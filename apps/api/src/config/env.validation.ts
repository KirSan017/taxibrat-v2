import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("90d"),
  EXOLVE_API_KEY: z.string().default(""),
  EXOLVE_SENDER: z.string().default(""),
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  TELEGRAM_GATEWAY_TOKEN: z.string().default(""),
  API_PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Environment validation failed:\n${parsed.error.issues.map((i) => `  ${i.path}: ${i.message}`).join("\n")}`
    );
  }
  return parsed.data;
}

export type EnvConfig = z.infer<typeof envSchema>;
