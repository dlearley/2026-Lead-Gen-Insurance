// Field Mapping Service - Manage data transformation between systems

import { PrismaClient } from '@prisma/client'
import { CreateFieldMappingInput } from './types.js'

export class FieldMappingService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
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

  async getFieldMapping(mappingId: string): Promise<any> {
    return this.prisma.integrationMapping.findUnique({
      where: { id: mappingId },
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

  async transformData(
    integrationId: string,
    sourceData: any
  ): Promise<{ transformedData: any; unmappedFields: string[] }> {
    const mappings = await this.prisma.integrationMapping.findMany({
      where: {
        integrationId,
        isActive: true,
      },
    })

    const transformedData: any = {}
    const unmappedFields: string[] = []

    mappings.forEach((mapping) => {
      if (sourceData[mapping.sourceField] !== undefined) {
        let value = sourceData[mapping.sourceField]

        // Apply transformation rules if they exist
        if (mapping.transformationRules) {
          try {
            // Simple transformation - in a real implementation this would be more sophisticated
            if (mapping.transformationRules.trim) {
              value = typeof value === 'string' ? value.trim() : value
            }
            if (mapping.transformationRules.uppercase) {
              value = typeof value === 'string' ? value.toUpperCase() : value
            }
            if (mapping.transformationRules.lowercase) {
              value = typeof value === 'string' ? value.toLowerCase() : value
            }
          } catch (error) {
            console.error('Error applying transformation:', error)
          }
        }

        transformedData[mapping.targetField] = value
      }
    })

    // Find unmapped fields
    Object.keys(sourceData).forEach((field) => {
      const hasMapping = mappings.some((m) => m.sourceField === field)
      if (!hasMapping) {
        unmappedFields.push(field)
      }
    })

    return { transformedData, unmappedFields }
  }

  async reverseTransformData(
    integrationId: string,
    targetData: any
  ): Promise<{ sourceData: any; unmappedFields: string[] }> {
    const mappings = await this.prisma.integrationMapping.findMany({
      where: {
        integrationId,
        isActive: true,
      },
    })

    const sourceData: any = {}
    const unmappedFields: string[] = []

    mappings.forEach((mapping) => {
      if (targetData[mapping.targetField] !== undefined) {
        let value = targetData[mapping.targetField]

        // Apply reverse transformation rules if they exist
        if (mapping.transformationRules) {
          try {
            // Simple reverse transformation
            if (mapping.transformationRules.uppercase) {
              value = typeof value === 'string' ? value.toLowerCase() : value
            }
            if (mapping.transformationRules.lowercase) {
              value = typeof value === 'string' ? value.toUpperCase() : value
            }
          } catch (error) {
            console.error('Error applying reverse transformation:', error)
          }
        }

        sourceData[mapping.sourceField] = value
      }
    })

    // Find unmapped fields
    Object.keys(targetData).forEach((field) => {
      const hasMapping = mappings.some((m) => m.targetField === field)
      if (!hasMapping) {
        unmappedFields.push(field)
      }
    })

    return { sourceData, unmappedFields }
  }

  async validateFieldMappings(integrationId: string): Promise<{
    valid: boolean
    errors: string[]
  }> {
    const mappings = await this.prisma.integrationMapping.findMany({
      where: { integrationId },
    })

    const errors: string[] = []

    // Check for duplicate source fields
    const sourceFields = new Set<string>()
    const duplicateSourceFields = new Set<string>()

    mappings.forEach((mapping) => {
      if (sourceFields.has(mapping.sourceField)) {
        duplicateSourceFields.add(mapping.sourceField)
      }
      sourceFields.add(mapping.sourceField)
    })

    if (duplicateSourceFields.size > 0) {
      errors.push(`Duplicate source fields: ${Array.from(duplicateSourceFields).join(', ')}`)
    }

    // Check for duplicate target fields
    const targetFields = new Set<string>()
    const duplicateTargetFields = new Set<string>()

    mappings.forEach((mapping) => {
      if (targetFields.has(mapping.targetField)) {
        duplicateTargetFields.add(mapping.targetField)
      }
      targetFields.add(mapping.targetField)
    })

    if (duplicateTargetFields.size > 0) {
      errors.push(`Duplicate target fields: ${Array.from(duplicateTargetFields).join(', ')}`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async getMappingCoverage(integrationId: string): Promise<{
    sourceFieldCount: number
    targetFieldCount: number
    coveragePercentage: number
  }> {
    const mappings = await this.prisma.integrationMapping.findMany({
      where: { integrationId },
    })

    // In a real implementation, you would compare against the actual schemas
    // For now, we'll just return the count of mappings
    return {
      sourceFieldCount: mappings.length,
      targetFieldCount: mappings.length,
      coveragePercentage: 100, // Placeholder
    }
  }

  async exportFieldMappings(integrationId: string): Promise<any[]> {
    return this.prisma.integrationMapping.findMany({
      where: { integrationId },
    })
  }

  async importFieldMappings(integrationId: string, mappings: any[]): Promise<number> {
    // Delete existing mappings
    await this.prisma.integrationMapping.deleteMany({
      where: { integrationId },
    })

    // Create new mappings
    const result = await this.prisma.integrationMapping.createMany({
      data: mappings.map((m) => ({
        integrationId,
        sourceField: m.sourceField,
        targetField: m.targetField,
        transformationRules: m.transformationRules,
        isActive: m.isActive !== false, // Default to true
      })),
    })

    return result.count
  }
}