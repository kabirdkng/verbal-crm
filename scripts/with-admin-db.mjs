#!/usr/bin/env node
/**
 * Run Prisma CLI commands with DATABASE_URL_ADMIN when present
 * so migrations/seed use the owner/superuser, while the app uses verbal_app.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i);
    const value = trimmed.slice(i + 1);
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const command = process.argv[2];
const adminUrl = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL;
if (!adminUrl) {
  console.error("DATABASE_URL_ADMIN or DATABASE_URL is required");
  process.exit(1);
}

process.env.DATABASE_URL = adminUrl;

const args =
  command === "migrate"
    ? ["prisma", "migrate", "dev", ...process.argv.slice(3)]
    : command === "migrate:deploy"
      ? ["prisma", "migrate", "deploy"]
      : command === "seed"
        ? ["prisma", "db", "seed"]
        : null;

if (!args) {
  console.error("Usage: node scripts/with-admin-db.mjs <migrate|migrate:deploy|seed>");
  process.exit(1);
}

const result = spawnSync("npx", args, { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
