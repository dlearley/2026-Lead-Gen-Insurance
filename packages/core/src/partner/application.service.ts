/**
 * Phase 30: Partner Ecosystem & Integrations
 * Application Service - Handles partner application management and approval workflows
 */

import { PrismaClient } from '@prisma/client';
import type {
  PartnerApplication,
  ApplicationStatus,
  CreateApplicationRequest,
  SubmitApplicationRequest,
} from '@insurance-platform/types';

export class ApplicationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new application
   */
  async createApplication(
    partnerId: string,
    request: CreateApplicationRequest
  ): Promise<PartnerApplication> {
    const application = await this.prisma.partnerApplication.create({
      data: {
        partnerId,
        appName: request.appName,
        description: request.description,
        appVersion: '1.0.0',
        permissions: request.permissions || [],
        dataAccess: request.dataAccess,
        securityInfo: request.securityInfo,
        status: 'DRAFT',
      },
    });

    return application as PartnerApplication;
  }

  /**
   * Get application by ID
   */
  async getApplicationById(id: string): Promise<PartnerApplication | null> {
    const application = await this.prisma.partnerApplication.findUnique({
      where: { id },
      include: {
        partner: true,
        apiKeys: true,
        integrations: true,
        listings: true,
      },
    });

    return application as PartnerApplication | null;
  }

  /**
   * List applications
   */
  async listApplications(filters: {
    partnerId?: string;
    status?: ApplicationStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ applications: PartnerApplication[]; total: number }> {
    const where: any = {};

    if (filters.partnerId) {
      where.partnerId = filters.partnerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { appName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [applications, total] = await Promise.all([
      this.prisma.partnerApplication.findMany({
        where,
        include: {
          partner: true,
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.partnerApplication.count({ where }),
    ]);

    return {
      applications: applications as PartnerApplication[],
      total,
    };
  }

  /**
   * Update application
   */
  async updateApplication(
    id: string,
    updates: {
      appName?: string;
      description?: string;
      appVersion?: string;
      permissions?: string[];
      dataAccess?: Record<string, any>;
      securityInfo?: Record<string, any>;
    }
  ): Promise<PartnerApplication> {
    const application = await this.prisma.partnerApplication.update({
      where: { id },
      data: updates,
    });

    return application as PartnerApplication;
  }

  /**
   * Submit application for approval
   */
  async submitForApproval(
    id: string,
    request: SubmitApplicationRequest
  ): Promise<PartnerApplication> {
    const application = await this.prisma.partnerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'DRAFT' && application.status !== 'REJECTED') {
      throw new Error('Application cannot be submitted in current status');
    }

    // Update application with submission details
    const updated = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedDate: new Date(),
        securityInfo: {
          ...(application.securityInfo as any),
          certifications: request.securityCertifications,
          complianceDocuments: request.complianceDocuments,
          testResults: request.testResults,
        },
      },
    });

    // TODO: Notify admins for review
    // TODO: Run automated security scans

    return updated as PartnerApplication;
  }

  /**
   * Approve application (admin only)
   */
  async approveApplication(
    id: string,
    approverId: string,
    comments?: string
  ): Promise<PartnerApplication> {
    const application = await this.prisma.partnerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'SUBMITTED') {
      throw new Error('Only submitted applications can be approved');
    }

    const updated = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedDate: new Date(),
        approvalStatus: `Approved by ${approverId}. ${comments || ''}`,
      },
    });

    // TODO: Notify partner of approval
    // TODO: Enable API access

    return updated as PartnerApplication;
  }

  /**
   * Reject application (admin only)
   */
  async rejectApplication(
    id: string,
    approverId: string,
    reason: string
  ): Promise<PartnerApplication> {
    const application = await this.prisma.partnerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'SUBMITTED') {
      throw new Error('Only submitted applications can be rejected');
    }

    const updated = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvalStatus: `Rejected by ${approverId}. Reason: ${reason}`,
      },
    });

    // TODO: Notify partner of rejection with feedback

    return updated as PartnerApplication;
  }

  /**
   * Publish application to marketplace
   */
  async publishApplication(id: string): Promise<PartnerApplication> {
    const application = await this.prisma.partnerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'APPROVED') {
      throw new Error('Only approved applications can be published');
    }

    const updated = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
      },
    });

    return updated as PartnerApplication;
  }

  /**
   * Suspend application
   */
  async suspendApplication(id: string, reason: string): Promise<PartnerApplication> {
    const application = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        approvalStatus: `Suspended. Reason: ${reason}`,
      },
    });

    // TODO: Revoke API keys
    // TODO: Disable integrations
    // TODO: Notify partner

    return application as PartnerApplication;
  }

  /**
   * Deprecate application
   */
  async deprecateApplication(id: string, sunsetDate?: Date): Promise<PartnerApplication> {
    const application = await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        status: 'DEPRECATED',
        approvalStatus: `Deprecated. ${sunsetDate ? `Sunset date: ${sunsetDate.toISOString()}` : ''}`,
      },
    });

    // TODO: Notify existing users
    // TODO: Set sunset timeline

    return application as PartnerApplication;
  }

  /**
   * Delete application
   */
  async deleteApplication(id: string): Promise<void> {
    await this.prisma.partnerApplication.delete({
      where: { id },
    });
  }

  /**
   * Get application statistics
   */
  async getApplicationStatistics(id: string): Promise<{
    installations: number;
    activeIntegrations: number;
    totalApiCalls: bigint;
    avgRating?: number;
  }> {
    const [integrations, listings, usage] = await Promise.all([
      this.prisma.integration.count({
        where: { appId: id, status: 'ACTIVE' },
      }),
      this.prisma.marketplaceListing.findFirst({
        where: { appId: id },
      }),
      this.prisma.partnerUsage.aggregate({
        where: {
          appId: id,
          metricName: 'api_calls',
        },
        _sum: {
          metricValue: true,
        },
      }),
    ]);

    return {
      installations: integrations,
      activeIntegrations: integrations,
      totalApiCalls: usage._sum.metricValue || BigInt(0),
      avgRating: listings?.averageRating,
    };
  }

  /**
   * Run security validation (automated checks)
   */
  async runSecurityValidation(id: string): Promise<{
    passed: boolean;
    issues: string[];
  }> {
    const application = await this.prisma.partnerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const issues: string[] = [];

    // Check required fields
    if (!application.permissions || (application.permissions as any[]).length === 0) {
      issues.push('No permissions specified');
    }

    if (!application.dataAccess) {
      issues.push('No data access requirements specified');
    }

    if (!application.securityInfo) {
      issues.push('No security information provided');
    }

    // Check for overly broad permissions
    const permissions = application.permissions as string[];
    if (permissions.includes('admin')) {
      issues.push('Admin permission should not be requested');
    }

    // TODO: Add more sophisticated security checks
    // - Rate of permission requests
    // - Suspicious patterns
    // - Known malicious patterns

    return {
      passed: issues.length === 0,
      issues,
    };
  }
}
