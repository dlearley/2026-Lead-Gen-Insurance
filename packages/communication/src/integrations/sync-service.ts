// Sync Service - Handle bi-directional data synchronization

import { PrismaClient } from '@prisma/client'
import { IntegrationSync, TriggerSyncInput, CreateFieldMappingInput } from './types.js'

export class SyncService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async triggerSync(input: TriggerSyncInput): Promise<IntegrationSync> {
    const { integrationId, syncType, direction } = input

    return this.prisma.$transaction(async (tx) => {
      // Create sync record
      const sync = await tx.integrationSync.create({
        data: {
          integrationId,
          syncType,
          direction,
          status: 'running',
          lastRun: new Date(),
          syncedRecords: 0,
          failedRecords: 0,
        },
      })

      try {
        // In a real implementation, this would perform the actual sync
        // For now, we'll simulate a successful sync
        await new Promise((resolve) => setTimeout(resolve, 1000))

        return tx.integrationSync.update({
          where: { id: sync.id },
          data: {
            status: 'success',
            syncedRecords: 10, // Simulated
            failedRecords: 0,
          },
        })
      } catch (error) {
        return tx.integrationSync.update({
          where: { id: sync.id },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      }
    })
  }

  async getSyncStatus(syncId: string): Promise<IntegrationSync | null> {
    return this.prisma.integrationSync.findUnique({
      where: { id: syncId },
    })
  }

  async getSyncHistory(integrationId: string, limit: number = 20): Promise<IntegrationSync[]> {
    return this.prisma.integrationSync.findMany({
      where: { integrationId },
      orderBy: { lastRun: 'desc' },
      take: limit,
    })
  }

  async createFieldMapping(input: CreateFieldMappingInput): Promise<any> {
    const { integrationId, sourceField, targetField, transformationRules } = input

    return this.prisma.integrationMapping.create({
      data: {
        integrationId,
        sourceField,
        targetField,
        transformationRules,
      },
    })
  }

  async getFieldMappings(integrationId: string): Promise<any[]> {
    return this.prisma.integrationMapping.findMany({
      where: { integrationId },
    })
  }

  async updateFieldMapping(
    mappingId: string,
    data: Partial<Omit<CreateFieldMappingInput, 'integrationId'>>
  ): Promise<any> {
    return this.prisma.integrationMapping.update({
      where: { id: mappingId },
      data,
    })
  }

  async deleteFieldMapping(mappingId: string): Promise<any> {
    return this.prisma.integrationMapping.delete({
      where: { id: mappingId },
    })
  }

  async getSyncStats(integrationId: string): Promise<{
    totalSyncs: number
    successfulSyncs: number
    failedSyncs: number
    totalRecordsSynced: number
    totalRecordsFailed: number
  }> {
    const syncs = await this.prisma.integrationSync.findMany({
      where: { integrationId },
    })

    return {
      totalSyncs: syncs.length,
      successfulSyncs: syncs.filter((s) => s.status === 'success').length,
      failedSyncs: syncs.filter((s) => s.status === 'failed').length,
      totalRecordsSynced: syncs.reduce((sum, s) => sum + s.syncedRecords, 0),
      totalRecordsFailed: syncs.reduce((sum, s) => sum + s.failedRecords, 0),
    }
  }

  async scheduleSync(
    integrationId: string,
    syncType: string,
    direction: 'one_way' | 'two_way',
    scheduleTime: Date
  ): Promise<IntegrationSync> {
    return this.prisma.integrationSync.create({
      data: {
        integrationId,
        syncType,
        direction,
        status: 'pending',
        lastRun: new Date(),
        nextRun: scheduleTime,
        syncedRecords: 0,
        failedRecords: 0,
      },
    })
  }

  async cancelPendingSyncs(integrationId: string): Promise<number> {
    const result = await this.prisma.integrationSync.deleteMany({
      where: {
        integrationId,
        status: 'pending',
      },
    })

    return result.count
  }

  async getPendingSyncs(integrationId: string): Promise<IntegrationSync[]> {
    return this.prisma.integrationSync.findMany({
      where: {
        integrationId,
        status: 'pending',
      },
      orderBy: { nextRun: 'asc' },
    })
  }

  async retryFailedSync(syncId: string): Promise<IntegrationSync> {
    return this.prisma.integrationSync.update({
      where: { id: syncId },
      data: {
        status: 'running',
        errorMessage: null,
        lastRun: new Date(),
      },
    })
  }
}