import {
  ClaimPayment,
  CreatePaymentDto,
  UpdatePaymentDto,
  ClaimSettlement,
  CreateSettlementDto,
  ClaimPaymentSchedule,
  CreatePaymentScheduleDto,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
  PayeeType,
  SettlementType,
  SettlementStatus,
  PaymentScheduleType,
  PaymentFrequency
} from '@insurance/types/claims';
import { BaseError } from '../errors.js';
import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';

/**
 * Payment Service - Manages claim payments, settlements, and payment scheduling
 */
export class PaymentService {
  private metrics = new MetricsCollector('claim_payments');

  /**
   * Create a payment request
   */
  async createPayment(data: CreatePaymentDto): Promise<{ success: boolean; data?: ClaimPayment; error?: string }> {
    try {
      // Validate claim exists and is in appropriate status
      const claim = await this.getClaimFromDatabase(data.claimId);
      if (!claim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }

      if (claim.status !== 'APPROVED' && claim.status !== 'SETTLED') {
        return {
          success: false,
          error: 'Payment can only be created for approved or settled claims'
        };
      }

      // Validate payment amount doesn't exceed claim reserves
      const availableAmount = await this.getAvailablePaymentAmount(data.claimId);
      if (data.paymentAmount > availableAmount) {
        return {
          success: false,
          error: `Payment amount exceeds available funds. Available: $${availableAmount}`
        };
      }

      // Generate payment reference
      const paymentReference = await this.generatePaymentReference();

      // Create payment record
      const payment = await this.createPaymentInDatabase({
        ...data,
        requestedDate: new Date(),
        paymentStatus: PaymentStatus.REQUESTED,
        confirmationNumber: paymentReference
      });

      this.metrics.incrementCounter('payments_requested', { 
        paymentType: data.paymentType,
        paymentMethod: data.paymentMethod 
      });

      logger.info('Payment request created', {
        paymentId: payment.id,
        claimId: data.claimId,
        amount: data.paymentAmount,
        paymentType: data.paymentType
      });

      return {
        success: true,
        data: payment,
        message: 'Payment request created successfully'
      };
    } catch (error) {
      logger.error('Failed to create payment', { error, data });
      this.metrics.incrementCounter('payment_creation_errors');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment'
      };
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    updateData: Partial<UpdatePaymentDto> = {},
    updatedBy?: string
  ): Promise<{ success: boolean; data?: ClaimPayment; error?: string }> {
    try {
      const payment = await this.getPaymentFromDatabase(paymentId);
      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      const oldStatus = payment.paymentStatus;
      const updates: any = {
        paymentStatus: status,
        ...updateData
      };

      // Set approval date when moving to approved status
      if (status === PaymentStatus.APPROVED && !payment.approvedDate) {
        updates.approvedDate = new Date();
      }

      // Set payment date when moving to sent/received status
      if ((status === PaymentStatus.SENT || status === PaymentStatus.RECEIVED) && !payment.paymentDate) {
        updates.paymentDate = new Date();
      }

      const updatedPayment = await this.updatePaymentInDatabase(paymentId, updates);

      // Handle status-specific actions
      await this.handlePaymentStatusChange(payment, oldStatus, status, updatedBy);

      // Update claim totals
      await this.updateClaimPaymentTotals(payment.claimId);

      this.metrics.incrementCounter('payments_status_updated', { 
        fromStatus: oldStatus,
        toStatus: status 
      });

      logger.info('Payment status updated', {
        paymentId,
        claimId: payment.claimId,
        fromStatus: oldStatus,
        toStatus: status,
        updatedBy
      });

      return {
        success: true,
        data: updatedPayment,
        message: `Payment status updated to ${status}`
      };
    } catch (error) {
      logger.error('Failed to update payment status', { error, paymentId, status });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update payment status'
      };
    }
  }

  /**
   * Get payments for a claim
   */
  async getClaimPayments(
    claimId: string,
    filters?: {
      paymentStatus?: PaymentStatus;
      paymentType?: PaymentType;
      payeeType?: PayeeType;
    }
  ): Promise<{ success: boolean; data?: ClaimPayment[]; error?: string }> {
    try {
      const payments = await this.getPaymentsByClaimId(claimId, filters || {});
      
      return {
        success: true,
        data: payments
      };
    } catch (error) {
      logger.error('Failed to retrieve claim payments', { error, claimId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve payments'
      };
    }
  }

  /**
   * Create settlement agreement
   */
  async createSettlement(data: CreateSettlementDto): Promise<{ success: boolean; data?: ClaimSettlement; error?: string }> {
    try {
      // Validate claim exists and is approved
      const claim = await this.getClaimFromDatabase(data.claimId);
      if (!claim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }

      if (claim.status !== 'APPROVED') {
        return {
          success: false,
          error: 'Settlement can only be created for approved claims'
        };
      }

      // Validate settlement amount against claim
      const maxSettlementAmount = await this.getMaximumSettlementAmount(data.claimId);
      if (data.settlementAmount > maxSettlementAmount) {
        return {
          success: false,
          error: `Settlement amount exceeds maximum allowable amount: $${maxSettlementAmount}`
        };
      }

      // Create settlement record
      const settlement = await this.createSettlementInDatabase({
        ...data,
        settlementStatus: SettlementStatus.PROPOSED,
        releaseSigned: false
      });

      // Update claim status to settled
      await this.updateClaimStatus(data.claimId, 'SETTLED');

      // Create settlement tasks
      await this.createSettlementTasks(data.claimId, settlement.id);

      this.metrics.incrementCounter('settlements_created', { 
        settlementType: data.settlementType 
      });

      logger.info('Settlement created', {
        settlementId: settlement.id,
        claimId: data.claimId,
        amount: data.settlementAmount,
        type: data.settlementType
      });

      return {
        success: true,
        data: settlement,
        message: 'Settlement created successfully'
      };
    } catch (error) {
      logger.error('Failed to create settlement', { error, data });
      this.metrics.incrementCounter('settlement_creation_errors');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create settlement'
      };
    }
  }

  /**
   * Accept/approve settlement
   */
  async acceptSettlement(
    settlementId: string,
    acceptedBy: string,
    acceptedByType: 'INSURED' | 'ADJUSTER' | 'ADMIN'
  ): Promise<{ success: boolean; data?: ClaimSettlement; error?: string }> {
    try {
      const settlement = await this.getSettlementFromDatabase(settlementId);
      if (!settlement) {
        return {
          success: false,
          error: 'Settlement not found'
        };
      }

      if (settlement.settlementStatus !== SettlementStatus.PROPOSED) {
        return {
          success: false,
          error: 'Only proposed settlements can be accepted'
        };
      }

      const updatedSettlement = await this.updateSettlementInDatabase(settlementId, {
        settlementStatus: SettlementStatus.ACCEPTED,
        releaseSigned: acceptedByType === 'INSURED',
        releaseSignedDate: acceptedByType === 'INSURED' ? new Date() : undefined
      });

      // If insured signed release, move to executed
      if (acceptedByType === 'INSURED') {
        await this.executeSettlement(settlementId);
      }

      this.metrics.incrementCounter('settlements_accepted', { 
        acceptedByType 
      });

      logger.info('Settlement accepted', {
        settlementId,
        acceptedBy,
        acceptedByType
      });

      return {
        success: true,
        data: updatedSettlement,
        message: 'Settlement accepted successfully'
      };
    } catch (error) {
      logger.error('Failed to accept settlement', { error, settlementId, acceptedBy });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept settlement'
      };
    }
  }

  /**
   * Create payment schedule for structured settlements
   */
  async createPaymentSchedule(data: CreatePaymentScheduleDto): Promise<{ 
    success: boolean; 
    data?: ClaimPaymentSchedule; 
    error?: string 
  }> {
    try {
      // Validate claim and settlement
      const claim = await this.getClaimFromDatabase(data.claimId);
      if (!claim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }

      const settlement = await this.getSettlementByClaimId(data.claimId);
      if (!settlement || settlement.settlementAmount < data.totalAmount) {
        return {
          success: false,
          error: 'Invalid settlement or amount'
        };
      }

      // Calculate payment schedule
      const paymentSchedule = this.calculatePaymentSchedule(data);

      const schedule = await this.createPaymentScheduleInDatabase({
        ...data,
        status: 'ACTIVE',
        lastPaymentDate: this.calculateLastPaymentDate(
          data.firstPaymentDate,
          data.paymentFrequency,
          data.totalAmount,
          data.paymentScheduleType
        )
      });

      // Generate individual payment records
      await this.generateScheduledPayments(schedule.id, paymentSchedule);

      this.metrics.incrementCounter('payment_schedules_created', { 
        scheduleType: data.paymentScheduleType,
        frequency: data.paymentFrequency 
      });

      return {
        success: true,
        data: schedule,
        message: 'Payment schedule created successfully'
      };
    } catch (error) {
      logger.error('Failed to create payment schedule', { error, data });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment schedule'
      };
    }
  }

  /**
   * Process scheduled payments
   */
  async processScheduledPayments(scheduleId: string): Promise<{ 
    success: boolean; 
    data?: { processed: number; failed: number }; 
    error?: string 
  }> {
    try {
      const schedule = await this.getPaymentScheduleFromDatabase(scheduleId);
      if (!schedule) {
        return {
          success: false,
          error: 'Payment schedule not found'
        };
      }

      const duePayments = await this.getDueScheduledPayments(scheduleId);
      let processed = 0;
      let failed = 0;

      for (const payment of duePayments) {
        try {
          // Create actual payment record
          const paymentResult = await this.createPaymentInDatabase({
            claimId: payment.claimId,
            paymentType: PaymentType.PARTIAL,
            paymentMethod: PaymentMethod.ACH, // Default method
            paymentAmount: payment.amount,
            payeeType: PayeeType.INSURED,
            paymentStatus: PaymentStatus.APPROVED,
            approvedDate: new Date()
          });

          if (paymentResult) {
            processed++;
            this.metrics.incrementCounter('scheduled_payments_processed');
          }
        } catch (paymentError) {
          failed++;
          logger.error('Failed to process scheduled payment', { 
            error: paymentError, 
            scheduledPaymentId: payment.id 
          });
        }
      }

      logger.info('Scheduled payments processed', { 
        scheduleId, 
        duePayments: duePayments.length,
        processed, 
        failed 
      });

      return {
        success: true,
        data: { processed, failed }
      };
    } catch (error) {
      logger.error('Failed to process scheduled payments', { error, scheduleId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payments'
      };
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(
    period: { from: Date; to: Date },
    filters?: {
      carrierId?: string;
      claimType?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const analytics = await this.calculatePaymentAnalytics(period, filters || {});
      
      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      logger.error('Failed to calculate payment analytics', { error, period });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate analytics'
      };
    }
  }

  /**
   * Handle payment status changes
   */
  private async handlePaymentStatusChange(
    payment: ClaimPayment,
    oldStatus: PaymentStatus,
    newStatus: PaymentStatus,
    updatedBy?: string
  ): Promise<void> {
    switch (newStatus) {
      case PaymentStatus.APPROVED:
        await this.createApprovalTasks(payment.claimId, payment.id);
        break;
      
      case PaymentStatus.FAILED:
        await this.handleFailedPayment(payment);
        break;
      
      case PaymentStatus.RECEIVED:
        await this.handleReceivedPayment(payment);
        break;
    }
  }

  /**
   * Calculate available payment amount for a claim
   */
  private async getAvailablePaymentAmount(claimId: string): Promise<number> {
    const claim = await this.getClaimFromDatabase(claimId);
    if (!claim) return 0;

    const reservedAmount = claim.reservedAmount || 0;
    const alreadyPaid = claim.paidAmount || 0;
    const subrogationRecovery = claim.subrogationRecovery || 0;

    return Math.max(0, reservedAmount - alreadyPaid + subrogationRecovery);
  }

  /**
   * Calculate maximum settlement amount
   */
  private async getMaximumSettlementAmount(claimId: string): Promise<number> {
    const claim = await this.getClaimFromDatabase(claimId);
    if (!claim) return 0;

    const coverageLimit = await this.getPolicyCoverageLimit(claim.policyId);
    const claimedAmount = claim.claimedAmount || 0;

    return Math.min(coverageLimit, claimedAmount);
  }

  /**
   * Calculate payment schedule details
   */
  private calculatePaymentSchedule(data: CreatePaymentScheduleDto): any {
    const payments = [];
    let currentDate = new Date(data.firstPaymentDate);
    const totalPayments = this.calculateTotalPayments(
      data.paymentScheduleType,
      data.paymentFrequency,
      data.totalAmount
    );

    const paymentAmount = data.totalAmount / totalPayments;

    for (let i = 0; i < totalPayments; i++) {
      payments.push({
        dueDate: new Date(currentDate),
        amount: paymentAmount,
        paymentNumber: i + 1
      });

      currentDate = this.addPaymentInterval(currentDate, data.paymentFrequency);
    }

    return payments;
  }

  /**
   * Calculate last payment date
   */
  private calculateLastPaymentDate(
    firstPaymentDate: Date,
    frequency: PaymentFrequency,
    totalAmount: number,
    scheduleType: PaymentScheduleType
  ): Date {
    const totalPayments = this.calculateTotalPayments(scheduleType, frequency, totalAmount);
    let lastPaymentDate = new Date(firstPaymentDate);

    for (let i = 1; i < totalPayments; i++) {
      lastPaymentDate = this.addPaymentInterval(lastPaymentDate, frequency);
    }

    return lastPaymentDate;
  }

  /**
   * Add payment interval to date
   */
  private addPaymentInterval(date: Date, frequency: PaymentFrequency): Date {
    const newDate = new Date(date);
    
    switch (frequency) {
      case PaymentFrequency.MONTHLY:
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case PaymentFrequency.QUARTERLY:
        newDate.setMonth(newDate.getMonth() + 3);
        break;
      case PaymentFrequency.SEMI_ANNUAL:
        newDate.setMonth(newDate.getMonth() + 6);
        break;
      case PaymentFrequency.ANNUAL:
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }

    return newDate;
  }

  /**
   * Calculate total number of payments
   */
  private calculateTotalPayments(
    scheduleType: PaymentScheduleType,
    frequency: PaymentFrequency,
    totalAmount: number
  ): number {
    // This would be more sophisticated in production
    // For now, return a default based on schedule type
    switch (scheduleType) {
      case PaymentScheduleType.STRUCTURED_SETTLEMENT:
        return 240; // 20 years monthly
      case PaymentScheduleType.INSTALLMENT:
        return 12; // 1 year monthly
      case PaymentScheduleType.ANNUITY:
        return 360; // 30 years monthly
      default:
        return 12;
    }
  }

  /**
   * Generate unique payment reference
   */
  private async generatePaymentReference(): Promise<string> {
    const prefix = 'PAY';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Database abstraction methods
  private async createPaymentInDatabase(data: any): Promise<ClaimPayment> {
    throw new Error('Database implementation required');
  }

  private async getPaymentFromDatabase(id: string): Promise<ClaimPayment | null> {
    throw new Error('Database implementation required');
  }

  private async updatePaymentInDatabase(id: string, data: any): Promise<ClaimPayment> {
    throw new Error('Database implementation required');
  }

  private async getPaymentsByClaimId(claimId: string, filters: any): Promise<ClaimPayment[]> {
    throw new Error('Database implementation required');
  }

  private async createSettlementInDatabase(data: any): Promise<ClaimSettlement> {
    throw new Error('Database implementation required');
  }

  private async getSettlementFromDatabase(id: string): Promise<ClaimSettlement | null> {
    throw new Error('Database implementation required');
  }

  private async getSettlementByClaimId(claimId: string): Promise<ClaimSettlement | null> {
    throw new Error('Database implementation required');
  }

  private async updateSettlementInDatabase(id: string, data: any): Promise<ClaimSettlement> {
    throw new Error('Database implementation required');
  }

  private async createPaymentScheduleInDatabase(data: any): Promise<ClaimPaymentSchedule> {
    throw new Error('Database implementation required');
  }

  private async getPaymentScheduleFromDatabase(id: string): Promise<ClaimPaymentSchedule | null> {
    throw new Error('Database implementation required');
  }

  private async getDueScheduledPayments(scheduleId: string): Promise<any[]> {
    throw new Error('Database implementation required');
  }

  private async generateScheduledPayments(scheduleId: string, payments: any[]): Promise<void> {
    throw new Error('Database implementation required');
  }

  private async updateClaimStatus(claimId: string, status: string): Promise<void> {
    throw new Error('Database implementation required');
  }

  private async updateClaimPaymentTotals(claimId: string): Promise<void> {
    throw new Error('Database implementation required');
  }

  private async calculatePaymentAnalytics(period: any, filters: any): Promise<any> {
    throw new Error('Database implementation required');
  }

  private async getClaimFromDatabase(claimId: string): Promise<any> {
    throw new Error('Database implementation required');
  }

  private async getPolicyCoverageLimit(policyId: string): Promise<number> {
    throw new Error('Database implementation required');
  }

  // Helper methods for workflows
  private async executeSettlement(settlementId: string): Promise<void> {
    await this.updateSettlementInDatabase(settlementId, {
      settlementStatus: SettlementStatus.EXECUTED
    });
  }

  private async createSettlementTasks(claimId: string, settlementId: string): Promise<void> {
    // Implementation would create follow-up tasks
  }

  private async createApprovalTasks(claimId: string, paymentId: string): Promise<void> {
    // Implementation would create approval workflow tasks
  }

  private async handleFailedPayment(payment: ClaimPayment): Promise<void> {
    // Implementation would handle failed payment recovery
  }

  private async handleReceivedPayment(payment: ClaimPayment): Promise<void> {
    // Implementation would handle payment reconciliation
  }
}