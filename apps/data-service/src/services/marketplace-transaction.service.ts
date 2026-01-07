// Phase 12.6: Marketplace Transaction Service
import { PrismaClient } from '@prisma/client';
import {
  MarketplaceTransaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionSummary,
  TransactionStatus,
} from '@platform/types';

const prisma = new PrismaClient();

export class MarketplaceTransactionService {
  // Create a new transaction
  async createTransaction(dto: CreateTransactionDto): Promise<MarketplaceTransaction> {
    // Get item details
    const item = await prisma.marketplaceItem.findUnique({
      where: { id: dto.itemId },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Check inventory
    if (item.inventory !== null && item.inventory < dto.quantity) {
      throw new Error('Insufficient inventory');
    }

    // Get vendor to calculate commission
    const vendor = await prisma.marketplaceVendor.findUnique({
      where: { id: item.vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const unitPrice = item.price;
    const totalAmount = unitPrice * dto.quantity;
    const commissionAmount = totalAmount * vendor.commissionRate;
    const vendorPayout = totalAmount - commissionAmount;

    const transaction = await prisma.marketplaceTransaction.create({
      data: {
        itemId: dto.itemId,
        vendorId: item.vendorId,
        buyerId: dto.buyerId,
        type: dto.type,
        quantity: dto.quantity,
        unitPrice,
        totalAmount,
        currency: item.currency,
        commissionAmount,
        vendorPayout,
        paymentMethod: dto.paymentMethod,
        metadata: dto.metadata as any,
      },
    });

    // Update inventory if applicable
    if (item.inventory !== null) {
      await prisma.marketplaceItem.update({
        where: { id: dto.itemId },
        data: {
          inventory: { decrement: dto.quantity },
        },
      });
    }

    return this.mapToTransaction(transaction);
  }

  // Get transaction by ID
  async getTransactionById(id: string): Promise<MarketplaceTransaction | null> {
    const transaction = await prisma.marketplaceTransaction.findUnique({
      where: { id },
    });

    return transaction ? this.mapToTransaction(transaction) : null;
  }

  // Update transaction
  async updateTransaction(id: string, dto: UpdateTransactionDto): Promise<MarketplaceTransaction> {
    const transaction = await prisma.marketplaceTransaction.update({
      where: { id },
      data: dto as any,
    });

    return this.mapToTransaction(transaction);
  }

  // Complete transaction
  async completeTransaction(id: string, paymentReference: string): Promise<MarketplaceTransaction> {
    const transaction = await prisma.marketplaceTransaction.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        paymentReference,
        completedAt: new Date(),
      },
    });

    // Update vendor revenue
    await prisma.marketplaceVendor.update({
      where: { id: transaction.vendorId },
      data: {
        totalRevenue: { increment: transaction.vendorPayout },
      },
    });

    // Increment item purchase count
    await prisma.marketplaceItem.update({
      where: { id: transaction.itemId },
      data: {
        purchases: { increment: transaction.quantity },
      },
    });

    return this.mapToTransaction(transaction);
  }

  // Fail transaction
  async failTransaction(id: string, error?: string): Promise<MarketplaceTransaction> {
    const transaction = await prisma.marketplaceTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Restore inventory
    const item = await prisma.marketplaceItem.findUnique({
      where: { id: transaction.itemId },
    });

    if (item && item.inventory !== null) {
      await prisma.marketplaceItem.update({
        where: { id: transaction.itemId },
        data: {
          inventory: { increment: transaction.quantity },
        },
      });
    }

    const updated = await prisma.marketplaceTransaction.update({
      where: { id },
      data: {
        status: 'FAILED',
        metadata: {
          ...(transaction.metadata as any),
          error,
        },
      },
    });

    return this.mapToTransaction(updated);
  }

  // Refund transaction
  async refundTransaction(id: string): Promise<MarketplaceTransaction> {
    const transaction = await prisma.marketplaceTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'COMPLETED') {
      throw new Error('Only completed transactions can be refunded');
    }

    // Update vendor revenue
    await prisma.marketplaceVendor.update({
      where: { id: transaction.vendorId },
      data: {
        totalRevenue: { decrement: transaction.vendorPayout },
      },
    });

    // Restore inventory
    const item = await prisma.marketplaceItem.findUnique({
      where: { id: transaction.itemId },
    });

    if (item && item.inventory !== null) {
      await prisma.marketplaceItem.update({
        where: { id: transaction.itemId },
        data: {
          inventory: { increment: transaction.quantity },
          purchases: { decrement: transaction.quantity },
        },
      });
    }

    const updated = await prisma.marketplaceTransaction.update({
      where: { id },
      data: { status: 'REFUNDED' },
    });

    return this.mapToTransaction(updated);
  }

  // Get transactions by buyer
  async getTransactionsByBuyer(buyerId: string): Promise<MarketplaceTransaction[]> {
    const transactions = await prisma.marketplaceTransaction.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((t) => this.mapToTransaction(t));
  }

  // Get transactions by vendor
  async getTransactionsByVendor(vendorId: string): Promise<MarketplaceTransaction[]> {
    const transactions = await prisma.marketplaceTransaction.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((t) => this.mapToTransaction(t));
  }

  // Get transaction summary
  async getTransactionSummary(filters: {
    vendorId?: string;
    buyerId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TransactionSummary> {
    const where: any = {};

    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.buyerId) where.buyerId = filters.buyerId;
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const transactions = await prisma.marketplaceTransaction.findMany({
      where,
    });

    const totalTransactions = transactions.length;
    const totalRevenue = transactions
      .filter((t) => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const completedCount = transactions.filter((t) => t.status === 'COMPLETED').length;
    const pendingCount = transactions.filter((t) => t.status === 'PENDING').length;
    const failedCount = transactions.filter((t) => t.status === 'FAILED').length;

    const successRate = totalTransactions > 0 ? (completedCount / totalTransactions) * 100 : 0;

    return {
      totalTransactions,
      totalRevenue,
      averageTransactionValue,
      successRate,
      pendingCount,
      completedCount,
      failedCount,
    };
  }

  // Helper to map Prisma model to type
  private mapToTransaction(transaction: any): MarketplaceTransaction {
    return {
      id: transaction.id,
      itemId: transaction.itemId,
      vendorId: transaction.vendorId,
      buyerId: transaction.buyerId,
      type: transaction.type,
      status: transaction.status,
      quantity: transaction.quantity,
      unitPrice: transaction.unitPrice,
      totalAmount: transaction.totalAmount,
      currency: transaction.currency,
      commissionAmount: transaction.commissionAmount,
      vendorPayout: transaction.vendorPayout,
      paymentMethod: transaction.paymentMethod,
      paymentReference: transaction.paymentReference,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      completedAt: transaction.completedAt,
    };
  }
}
