import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      PERSISTENCE_MODE: "postgres",
      QUEUE_MODE: "redis",
      // App role (non-superuser) so FORCE RLS is enforced
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://verbal_app:verbal@localhost:5432/verbal_crm?schema=public",
      DATABASE_URL_ADMIN:
        process.env.DATABASE_URL_ADMIN ??
        "postgresql://verbal:verbal@localhost:5432/verbal_crm?schema=public",
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379"
    }
  }
});
