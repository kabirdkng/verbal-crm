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
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts", "node_modules"],
    // Unit suite always uses in-memory adapters even if .env.local is docker-backed.
    env: {
      PERSISTENCE_MODE: "memory",
      QUEUE_MODE: "memory"
    }
  }
});
