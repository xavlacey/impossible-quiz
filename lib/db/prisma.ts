import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DB_DATABASE_URL;
const prismaConfig: {
  log?: ("error" | "warn")[];
  datasources?: { db: { url: string } };
} = {
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
};

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
