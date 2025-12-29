import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  Certificate,
  CreateCertificateDto,
  CertificateValidation,
} from '@insurance-lead-gen/types';

const prisma = new PrismaClient();

export class CertificateService {
  // ========================================
  // Certificate Management
  // ========================================

  async getCertificates(filters: { agentId?: string; courseId?: string; status?: string } = {}): Promise<Certificate[]> {
    try {
      const { agentId, courseId, status } = filters;

      const certificates = await prisma.certificate.findMany({
        where: {
          agentId,
          courseId,
          status: status as any,
        },
        include: {
          course: {
            select: { id: true, title: true },
          },
          assessment: {
            select: { id: true, title: true },
          },
        },
        orderBy: { issueDate: 'desc' },
      });

      return certificates;
    } catch (error) {
      logger.error('Failed to get certificates', { error, filters });
      throw error;
    }
  }

  async getCertificateById(id: string): Promise<Certificate | null> {
    try {
      const certificate = await prisma.certificate.findUnique({
        where: { id },
        include: {
          course: true,
          assessment: true,
        },
      });

      return certificate;
    } catch (error) {
      logger.error('Failed to get certificate by id', { error, id });
      throw error;
    }
  }

  async createCertificate(dto: CreateCertificateDto): Promise<Certificate> {
    try {
      // Check if certificate already exists for this agent and course/assessment
      const existing = await prisma.certificate.findFirst({
        where: {
          agentId: dto.agentId,
          courseId: dto.courseId,
          assessmentId: dto.assessmentId,
          status: 'ACTIVE',
        },
      });

      if (existing) {
        throw new Error('Certificate already exists for this agent and course/assessment');
      }

      // Generate certificate number
      const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Generate verification URL
      const verificationUrl = `/verify/${certificateNumber}`;

      const certificate = await prisma.certificate.create({
        data: {
          agentId: dto.agentId,
          courseId: dto.courseId,
          assessmentId: dto.assessmentId,
          certificateNumber,
          title: dto.title,
          description: dto.description,
          expiryDate: dto.expiryDate,
          credentialId: dto.credentialId,
          verificationUrl,
          status: 'ACTIVE',
        },
      });

      logger.info('Certificate created', { certificateId: certificate.id, agentId: dto.agentId });
      return certificate;
    } catch (error) {
      logger.error('Failed to create certificate', { error, dto });
      throw error;
    }
  }

  async revokeCertificate(id: string, reason: string): Promise<Certificate> {
    try {
      const certificate = await prisma.certificate.update({
        where: { id },
        data: {
          status: 'REVOKED',
          // Store reason in metadata
          metadata: { revocationReason: reason },
        },
      });

      logger.info('Certificate revoked', { certificateId: id, reason });
      return certificate;
    } catch (error) {
      logger.error('Failed to revoke certificate', { error, id });
      throw error;
    }
  }

  async renewCertificate(id: string, newExpiryDate: Date): Promise<Certificate> {
    try {
      const certificate = await prisma.certificate.update({
        where: { id },
        data: {
          expiryDate: newExpiryDate,
          status: 'ACTIVE',
        },
      });

      logger.info('Certificate renewed', { certificateId: id, newExpiryDate });
      return certificate;
    } catch (error) {
      logger.error('Failed to renew certificate', { error, id, newExpiryDate });
      throw error;
    }
  }

  async deleteCertificate(id: string): Promise<void> {
    try {
      await prisma.certificate.delete({ where: { id } });
      logger.info('Certificate deleted', { certificateId: id });
    } catch (error) {
      logger.error('Failed to delete certificate', { error, id });
      throw error;
    }
  }

  // ========================================
  // Certificate Validation
  // ========================================

  async validateCertificate(certificateNumber: string): Promise<CertificateValidation> {
    try {
      const certificate = await prisma.certificate.findUnique({
        where: { certificateNumber },
        include: {
          course: true,
          assessment: true,
        },
      });

      if (!certificate) {
        return {
          valid: false,
          certificate: null as any,
          status: 'REVOKED',
        };
      }

      // Check if expired
      if (certificate.expiryDate && new Date() > certificate.expiryDate) {
        return {
          valid: false,
          certificate,
          status: 'EXPIRED',
        };
      }

      // Check if revoked
      if (certificate.status === 'REVOKED') {
        return {
          valid: false,
          certificate,
          status: 'REVOKED',
        };
      }

      // Valid certificate
      return {
        valid: true,
        certificate,
        courseTitle: certificate.course?.title,
        status: 'ACTIVE',
      };
    } catch (error) {
      logger.error('Failed to validate certificate', { error, certificateNumber });
      throw error;
    }
  }

  async validateCertificateById(id: string): Promise<CertificateValidation> {
    try {
      const certificate = await prisma.certificate.findUnique({
        where: { id },
        include: {
          course: true,
          assessment: true,
        },
      });

      if (!certificate) {
        return {
          valid: false,
          certificate: null as any,
          status: 'REVOKED',
        };
      }

      // Check if expired
      if (certificate.expiryDate && new Date() > certificate.expiryDate) {
        return {
          valid: false,
          certificate,
          status: 'EXPIRED',
        };
      }

      // Check if revoked
      if (certificate.status === 'REVOKED') {
        return {
          valid: false,
          certificate,
          status: 'REVOKED',
        };
      }

      // Valid certificate
      return {
        valid: true,
        certificate,
        courseTitle: certificate.course?.title,
        status: 'ACTIVE',
      };
    } catch (error) {
      logger.error('Failed to validate certificate', { error, id });
      throw error;
    }
  }

  // ========================================
  // Certificate Maintenance
  // ========================================

  async checkExpiredCertificates(): Promise<Certificate[]> {
    try {
      const expiredCertificates = await prisma.certificate.findMany({
        where: {
          status: 'ACTIVE',
          expiryDate: { lte: new Date() },
        },
      });

      // Update status to expired
      for (const cert of expiredCertificates) {
        await prisma.certificate.update({
          where: { id: cert.id },
          data: { status: 'EXPIRED' },
        });
      }

      logger.info('Expired certificates checked', { count: expiredCertificates.length });
      return expiredCertificates;
    } catch (error) {
      logger.error('Failed to check expired certificates', { error });
      throw error;
    }
  }

  async getExpiringSoon(days: number = 30): Promise<Certificate[]> {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      const certificates = await prisma.certificate.findMany({
        where: {
          status: 'ACTIVE',
          expiryDate: {
            lte: expiryDate,
          },
        },
        include: {
          course: {
            select: { id: true, title: true },
          },
        },
        orderBy: { expiryDate: 'asc' },
      });

      return certificates;
    } catch (error) {
      logger.error('Failed to get expiring certificates', { error, days });
      throw error;
    }
  }

  async getCertificatesByAgent(agentId: string): Promise<Certificate[]> {
    try {
      const certificates = await prisma.certificate.findMany({
        where: { agentId },
        include: {
          course: {
            select: { id: true, title: true },
          },
          assessment: {
            select: { id: true, title: true },
          },
        },
        orderBy: { issueDate: 'desc' },
      });

      return certificates;
    } catch (error) {
      logger.error('Failed to get certificates by agent', { error, agentId });
      throw error;
    }
  }
}

export const certificateService = new CertificateService();
