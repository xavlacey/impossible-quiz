import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure Prisma Client with connection pooling for serverless
// Support multiple environment variable names for compatibility:
// - DB_DATABASE_URL (primary, recommended)
// - DATABASE_URL (fallback, Prisma standard)
// - DB_URL (fallback)
// - POSTGRES_URL (Vercel Postgres alternative)
const databaseUrl = process.env.DB_DATABASE_URL;

// Build Prisma Client config
const prismaConfig: {
  log?: ("error" | "warn")[];
  datasources?: { db: { url: string } };
} = {
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
};

// Always override datasource URL to support fallback env vars
// This ensures compatibility even if DB_DATABASE_URL isn't set
if (databaseUrl) {
  prismaConfig.datasources = {
    db: {
      url: databaseUrl,
    },
  };
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaConfig);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
