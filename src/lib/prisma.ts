import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __verbalPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.__verbalPrisma) {
    globalForPrisma.__verbalPrisma = new PrismaClient({
      log: process.env.PRISMA_LOG === "true" ? ["query", "error", "warn"] : ["error"]
    });
  }
  return globalForPrisma.__verbalPrisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.__verbalPrisma) {
    await globalForPrisma.__verbalPrisma.$disconnect();
    globalForPrisma.__verbalPrisma = undefined;
  }
}

export function isPostgresMode(): boolean {
  return (
    process.env.PERSISTENCE_MODE === "postgres" ||
    process.env.PERSISTENCE_MODE === "prisma"
  );
}
