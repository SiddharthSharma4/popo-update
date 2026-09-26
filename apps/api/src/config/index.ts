/**
 * Configuration module with runtime environment variable validation.
 * Conforms to docs/contracts/02-architecture-contract.md and AGENTS.md §20.
 */

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("./data/osm.db"),
  CORS_ORIGIN: z.string().default("*"),
  AI_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
  AI_API_KEY: z.string().optional().default(""),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("FATAL: Invalid environment configuration:", parsed.error.format());
    throw new Error("Invalid application configuration");
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}
