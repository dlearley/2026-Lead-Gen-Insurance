import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';

class PrismaClientSingleton {
  private static instance: PrismaClient | null = null;

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient();
      logger.info('Prisma client initialized in API service');
    }
    return PrismaClientSingleton.instance;
  }
}

export const prisma = PrismaClientSingleton.getInstance();
