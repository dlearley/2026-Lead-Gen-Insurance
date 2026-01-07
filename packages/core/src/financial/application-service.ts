import { PrismaClient } from '@prisma/client';
import {
  ProductApplication,
  ApplicationStatus,
  CustomerProduct,
  CustomerProductStatus,
  SubmitApplicationRequest,
} from '@insurance-lead-gen/types';
import { Logger } from '../../logger.js';
import { AppError } from '../../errors.js';
import { OpenBankingService } from './open-banking-service.js';

/**
 * ProductApplicationService - Manages product applications and enrollment
 */
export class ProductApplicationService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
    private openBankingService: OpenBankingService
  ) {}

  /**
   * Submit a new product application
   */
  async submitApplication(request: SubmitApplicationRequest): Promise<ProductApplication> {
    try {
      this.logger.info('Submitting product application', { 
        customerId: request.customerId, 
        productId: request.productId 
      });

      // Validate customer eligibility
      await this.validateEligibility(request.customerId, request.productId);

      const application = await this.prisma.productApplication.create({
        data: {
          customerId: request.customerId,
          productId: request.productId,
          variantId: request.variantId,
          advisorId: request.advisorId,
          status: 'SUBMITTED' as ApplicationStatus,
          applicationData: request.applicationData || {},
          documents: request.documents || [],
          applicationDate: new Date(),
        },
      });

      this.logger.info('Product application submitted successfully', { 
        applicationId: application.id 
      });

      // Trigger automated review workflow
      this.processApplication(application.id).catch(error => {
        this.logger.error('Application processing failed', { error, applicationId: application.id });
      });

      return application;
    } catch (error) {
      this.logger.error('Failed to submit application', { error, request });
      throw new AppError('Failed to submit application', 500);
    }
  }

  /**
   * Validate customer eligibility for a product
   */
  private async validateEligibility(customerId: string, productId: string): Promise<void> {
    const product = await this.prisma.financialProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check if product is active
    if (product.status !== 'ACTIVE') {
      throw new AppError('Product is not currently available', 400);
    }

    // In real implementation, check:
    // - Age requirements
    // - Income requirements
    // - Geographic restrictions
    // - Credit score
    // - Existing product holdings
  }

  /**
   * Process application through automated workflow
   */
  async processApplication(applicationId: string): Promise<void> {
    try {
      this.logger.info('Processing application', { applicationId });

      const application = await this.prisma.productApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new AppError('Application not found', 404);
      }

      // Simulate automated review process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Auto-approval logic (simplified)
      const shouldApprove = Math.random() > 0.2; // 80% approval rate

      const updatedStatus = shouldApprove ? 'APPROVED' : 'DECLINED';

      await this.prisma.productApplication.update({
        where: { id: applicationId },
        data: {
          status: updatedStatus as ApplicationStatus,
          approvedDate: shouldApprove ? new Date() : undefined,
          decisionReason: shouldApprove ? 'Auto-approved' : 'Does not meet eligibility criteria',
        },
      });

      this.logger.info('Application processed', { applicationId, status: updatedStatus });

      // Enroll if approved
      if (shouldApprove) {
        await this.enrollCustomer(applicationId);
      }
    } catch (error) {
      this.logger.error('Failed to process application', { error, applicationId });
      throw error;
    }
  }

  /**
   * Enroll customer in product after approval
   */
  async enrollCustomer(applicationId: string): Promise<CustomerProduct> {
    try {
      const application = await this.prisma.productApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new AppError('Application not found', 404);
      }

      if (application.status !== 'APPROVED') {
        throw new AppError('Application must be approved before enrollment', 400);
      }

      // Generate account number
      const accountNumber = this.generateAccountNumber();

      const customerProduct = await this.prisma.customerProduct.create({
        data: {
          customerId: application.customerId,
          productId: application.productId,
          variantId: application.variantId,
          enrollmentDate: new Date(),
          accountNumber,
          status: 'ACTIVE' as CustomerProductStatus,
          balance: 0,
          currentValue: 0,
          performance: 0,
        },
      });

      // Update application with enrollment date
      await this.prisma.productApplication.update({
        where: { id: applicationId },
        data: { enrollmentDate: new Date() },
      });

      this.logger.info('Customer enrolled in product successfully', { 
        customerProductId: customerProduct.id 
      });

      return customerProduct;
    } catch (error) {
      this.logger.error('Failed to enroll customer', { error, applicationId });
      throw new AppError('Failed to enroll customer', 500);
    }
  }

  /**
   * Get application by ID
   */
  async getApplicationById(applicationId: string): Promise<ProductApplication | null> {
    try {
      return await this.prisma.productApplication.findUnique({
        where: { id: applicationId },
      });
    } catch (error) {
      this.logger.error('Failed to get application', { error, applicationId });
      throw new AppError('Failed to retrieve application', 500);
    }
  }

  /**
   * Get applications for a customer
   */
  async getCustomerApplications(customerId: string): Promise<ProductApplication[]> {
    try {
      return await this.prisma.productApplication.findMany({
        where: { customerId },
        include: {
          product: true,
        },
        orderBy: { applicationDate: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get customer applications', { error, customerId });
      throw new AppError('Failed to retrieve applications', 500);
    }
  }

  /**
   * Get customer products
   */
  async getCustomerProducts(customerId: string): Promise<CustomerProduct[]> {
    try {
      return await this.prisma.customerProduct.findMany({
        where: { 
          customerId,
          status: 'ACTIVE',
        },
        include: {
          product: true,
        },
        orderBy: { enrollmentDate: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get customer products', { error, customerId });
      throw new AppError('Failed to retrieve products', 500);
    }
  }

  /**
   * Generate account number
   */
  private generateAccountNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${timestamp}${random}`;
  }

  /**
   * Upload application document
   */
  async uploadDocument(
    applicationId: string,
    document: {
      documentType: string;
      documentUrl: string;
    }
  ): Promise<ProductApplication> {
    try {
      const application = await this.prisma.productApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new AppError('Application not found', 404);
      }

      const documents = application.documents || [];
      documents.push({
        ...document,
        uploadedAt: new Date(),
      });

      return await this.prisma.productApplication.update({
        where: { id: applicationId },
        data: { documents },
      });
    } catch (error) {
      this.logger.error('Failed to upload document', { error, applicationId });
      throw new AppError('Failed to upload document', 500);
    }
  }
}