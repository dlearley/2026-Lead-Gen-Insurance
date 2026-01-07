// Integration Service - Manage third-party integrations

import { PrismaClient } from '@prisma/client'
import { Integration, IntegrationType, ConnectIntegrationInput, UpdateIntegrationInput } from './types.js'

export class IntegrationService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async connectIntegration(input: ConnectIntegrationInput): Promise<Integration> {
    const { organizationId, integrationType, credentials, config = {} } = input

    return this.prisma.integration.create({
      data: {
        organizationId,
        integrationType,
        isActive: true,
        isAuthenticated: true, // Would be set based on auth result
        credentials,
        config,
      },
    })
  }

  async getIntegration(integrationId: string): Promise<Integration | null> {
    return this.prisma.integration.findUnique({
      where: { id: integrationId },
    })
  }

  async listIntegrations(organizationId: string): Promise<Integration[]> {
    return this.prisma.integration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateIntegration(input: UpdateIntegrationInput): Promise<Integration> {
    const { integrationId, ...data } = input

    return this.prisma.integration.update({
      where: { id: integrationId },
      data,
    })
  }

  async disconnectIntegration(integrationId: string): Promise<Integration> {
    return this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        isActive: false,
        isAuthenticated: false,
        // In a real implementation, you'd clear sensitive credentials
      },
    })
  }

  async checkIntegrationStatus(integrationId: string): Promise<{ status: string; error?: string }> {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return { status: 'not_found', error: 'Integration not found' }
    }

    if (!integration.isActive) {
      return { status: 'inactive' }
    }

    if (!integration.isAuthenticated) {
      return { status: 'unauthenticated' }
    }

    // In a real implementation, you'd test the actual connection
    return { status: 'active' }
  }

  async getIntegrationConfig(integrationId: string): Promise<any> {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
      select: { config: true },
    })

    return integration?.config || {}
  }

  async updateIntegrationConfig(integrationId: string, config: any): Promise<Integration> {
    return this.prisma.integration.update({
      where: { id: integrationId },
      data: { config },
    })
  }

  async getIntegrationByType(
    organizationId: string,
    integrationType: IntegrationType
  ): Promise<Integration | null> {
    return this.prisma.integration.findFirst({
      where: {
        organizationId,
        integrationType,
        isActive: true,
      },
    })
  }

  async getActiveIntegrations(organizationId: string): Promise<Integration[]> {
    return this.prisma.integration.findMany({
      where: {
        organizationId,
        isActive: true,
        isAuthenticated: true,
      },
    })
  }

  async enableIntegrationSync(integrationId: string): Promise<Integration> {
    return this.prisma.integration.update({
      where: { id: integrationId },
      data: { syncEnabled: true },
    })
  }

  async disableIntegrationSync(integrationId: string): Promise<Integration> {
    return this.prisma.integration.update({
      where: { id: integrationId },
      data: { syncEnabled: false },
    })
  }

  async getIntegrationStats(organizationId: string): Promise<{
    totalIntegrations: number
    activeIntegrations: number
    byType: Record<string, number>
  }> {
    const integrations = await this.prisma.integration.findMany({
      where: { organizationId },
    })

    const byType: Record<string, number> = {}
    integrations.forEach((integration) => {
      byType[integration.integrationType] = (byType[integration.integrationType] || 0) + 1
    })

    return {
      totalIntegrations: integrations.length,
      activeIntegrations: integrations.filter((i) => i.isActive).length,
      byType,
    }
  }
}