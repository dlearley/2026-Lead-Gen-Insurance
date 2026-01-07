import { PrismaClient } from '@prisma/client';
import {
  CustomerAccount,
  Portfolio,
  PortfolioHolding,
  PortfolioType,
  PortfolioStatus,
  AccountType,
} from '@insurance-lead-gen/types';
import { Logger } from '../../logger.js';
import { AppError } from '../../errors.js';

/**
 * WealthManagementService - Manages portfolios, accounts, and investment tracking
 */
export class WealthManagementService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger
  ) {}

  /**
   * Create a new portfolio
   */
  async createPortfolio(data: {
    customerId: string;
    portfolioName?: string;
    portfolioType?: PortfolioType;
  }): Promise<Portfolio> {
    try {
      this.logger.info('Creating portfolio', { customerId: data.customerId });

      const portfolio = await this.prisma.portfolio.create({
        data: {
          customerId: data.customerId,
          portfolioName: data.portfolioName || 'My Portfolio',
          portfolioType: data.portfolioType || 'ROBO',
          status: 'ACTIVE' as PortfolioStatus,
          totalValue: 0,
          cashPosition: 0,
        },
      });

      this.logger.info('Portfolio created successfully', { portfolioId: portfolio.id });
      return portfolio;
    } catch (error) {
      this.logger.error('Failed to create portfolio', { error, data });
      throw new AppError('Failed to create portfolio', 500);
    }
  }

  /**
   * Get portfolio by ID
   */
  async getPortfolioById(portfolioId: string): Promise<Portfolio | null> {
    try {
      return await this.prisma.portfolio.findUnique({
        where: { id: portfolioId },
        include: {
          holdings: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to get portfolio', { error, portfolioId });
      throw new AppError('Failed to retrieve portfolio', 500);
    }
  }

  /**
   * Get portfolios for a customer
   */
  async getCustomerPortfolios(customerId: string): Promise<Portfolio[]> {
    try {
      return await this.prisma.portfolio.findMany({
        where: { 
          customerId,
          status: 'ACTIVE',
        },
        include: {
          holdings: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get customer portfolios', { error, customerId });
      throw new AppError('Failed to retrieve portfolios', 500);
    }
  }

  /**
   * Create a portfolio holding
   */
  async createHolding(data: {
    portfolioId: string;
    securityId?: string;
    symbol?: string;
    quantity: number;
    costBasis?: number;
    currentValue: number;
    purchaseDate?: Date;
  }): Promise<PortfolioHolding> {
    try {
      this.logger.info('Creating portfolio holding', { portfolioId: data.portfolioId });

      const holding = await this.prisma.portfolioHolding.create({
        data: {
          portfolioId: data.portfolioId,
          securityId: data.securityId,
          symbol: data.symbol,
          quantity: data.quantity,
          costBasis: data.costBasis || 0,
          currentValue: data.currentValue,
          purchaseDate: data.purchaseDate || new Date(),
          unrealizedGainLoss: data.currentValue - (data.costBasis || 0),
          allocationPercentage: 0, // Will be recalculated
        },
      });

      // Recalculate portfolio allocations
      await this.recalculatePortfolio(data.portfolioId);

      this.logger.info('Portfolio holding created successfully', { holdingId: holding.id });
      return holding;
    } catch (error) {
      this.logger.error('Failed to create holding', { error, data });
      throw new AppError('Failed to create portfolio holding', 500);
    }
  }

  /**
   * Update holding current value and recalculate portfolio
   */
  async updateHoldingValue(
    holdingId: string,
    currentValue: number
  ): Promise<PortfolioHolding> {
    try {
      const holding = await this.prisma.portfolioHolding.findUnique({
        where: { id: holdingId },
      });

      if (!holding) {
        throw new AppError('Holding not found', 404);
      }

      const updatedHolding = await this.prisma.portfolioHolding.update({
        where: { id: holdingId },
        data: {
          currentValue,
          unrealizedGainLoss: currentValue - (holding.costBasis || 0),
        },
      });

      // Recalculate portfolio
      await this.recalculatePortfolio(holding.portfolioId);

      return updatedHolding;
    } catch (error) {
      this.logger.error('Failed to update holding', { error, holdingId });
      throw new AppError('Failed to update holding', 500);
    }
  }

  /**
   * Get holdings for a portfolio
   */
  async getPortfolioHoldings(portfolioId: string): Promise<PortfolioHolding[]> {
    try {
      return await this.prisma.portfolioHolding.findMany({
        where: { portfolioId },
        orderBy: [{ currentValue: 'desc' }],
      });
    } catch (error) {
      this.logger.error('Failed to get holdings', { error, portfolioId });
      throw new AppError('Failed to retrieve holdings', 500);
    }
  }

  /**
   * Recalculate portfolio allocations and totals
   */
  async recalculatePortfolio(portfolioId: string): Promise<Portfolio> {
    try {
      const holdings = await this.getPortfolioHoldings(portfolioId);
      
      const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
      const cashPosition = holdings
        .filter(h => h.symbol === 'CASH')
        .reduce((sum, holding) => sum + holding.currentValue, 0);

      // Update allocations
      for (const holding of holdings) {
        const allocationPercentage = totalValue > 0 
          ? (holding.currentValue / totalValue) * 100 
          : 0;

        await this.prisma.portfolioHolding.update({
          where: { id: holding.id },
          data: { allocationPercentage },
        });
      }

      // Update portfolio totals
      const portfolio = await this.prisma.portfolio.update({
        where: { id: portfolioId },
        data: {
          totalValue,
          cashPosition,
          actualAllocation: this.calculateAssetAllocation(holdings),
        },
      });

      return portfolio;
    } catch (error) {
      this.logger.error('Failed to recalculate portfolio', { error, portfolioId });
      throw new AppError('Failed to recalculate portfolio', 500);
    }
  }

  /**
   * Calculate asset allocation from holdings
   */
  private calculateAssetAllocation(holdings: PortfolioHolding[]): Record<string, number> {
    const allocation: Record<string, number> = {};
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

    if (totalValue === 0) return allocation;

    // Group by asset class (simplified - in real implementation would use security classification)
    for (const holding of holdings) {
      const assetClass = this.getAssetClass(holding.symbol);
      const percentage = (holding.currentValue / totalValue) * 100;
      allocation[assetClass] = (allocation[assetClass] || 0) + percentage;
    }

    return allocation;
  }

  /**
   * Determine asset class from symbol (simplified)
   */
  private getAssetClass(symbol?: string): string {
    if (!symbol) return 'OTHER';
    if (symbol === 'CASH') return 'CASH';
    if (symbol && ['SPY', 'VOO', 'VTI'].includes(symbol)) return 'EQUITY_US';
    if (symbol && symbol.endsWith('.BD')) return 'BONDS';
    return 'EQUITY';
  }

  /**
   * Link an external account
   */
  async linkAccount(data: {
    customerId: string;
    externalAccountId: string;
    institutionName: string;
    accountType: AccountType;
    accountNumber?: string;
    balance: number;
  }): Promise<CustomerAccount> {
    try {
      this.logger.info('Linking external account', { 
        customerId: data.customerId,
        institutionName: data.institutionName 
      });

      const account = await this.prisma.customerAccount.create({
        data: {
          customerId: data.customerId,
          externalAccountId: data.externalAccountId,
          institutionName: data.institutionName,
          accountType: data.accountType,
          accountName: `${data.institutionName} ${data.accountType}`,
          balance: data.balance,
          currency: 'USD',
          isAggregated: true,
          aggregationSource: 'MANUAL',
        },
      });

      this.logger.info('Account linked successfully', { accountId: account.id });
      return account;
    } catch (error) {
      this.logger.error('Failed to link account', { error, data });
      throw new AppError('Failed to link account', 500);
    }
  }

  /**
   * Sync account balances
   */
  async syncAccountBalances(customerId: string): Promise<void> {
    try {
      const accounts = await this.prisma.customerAccount.findMany({
        where: { 
          customerId,
          isAggregated: true,
        },
      });

      // In real implementation, fetch balances from external APIs
      for (const account of accounts) {
        // Simulate balance update
        await this.prisma.customerAccount.update({
          where: { id: account.id },
          data: {
            lastSyncedAt: new Date(),
          },
        });
      }

      this.logger.info('Account balances synced', { customerId, count: accounts.length });
    } catch (error) {
      this.logger.error('Failed to sync balances', { error, customerId });
      throw new AppError('Failed to sync account balances', 500);
    }
  }

  /**
   * Generate portfolio performance report
   */
  async generatePerformanceReport(
    portfolioId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    periodReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  }> {
    try {
      // In real implementation, calculate from historical data
      const report = {
        periodReturn: 0.085, // 8.5%
        annualizedReturn: 0.12, // 12%
        volatility: 0.15, // 15%
        sharpeRatio: 0.8,
        maxDrawdown: 0.12, // 12%
      };

      this.logger.info('Performance report generated', { portfolioId });
      return report;
    } catch (error) {
      this.logger.error('Failed to generate performance report', { error, portfolioId });
      throw new AppError('Failed to generate performance report', 500);
    }
  }
}