import { PrismaClient } from '@prisma/client';
import { getSecretsManager } from '@insurance-lead-gen/core';

let prisma: PrismaClient;

export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function initializePrisma() {
  const secretsManager = getSecretsManager();
  const dbUrl = await secretsManager.getSecret('DATABASE_URL');
  
  if (dbUrl) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  } else {
    prisma = new PrismaClient();
  }
  
  await prisma.$connect();
  return prisma;
}

export { prisma };
