// Phase 12.6: Marketplace - Type definitions for marketplace functionality

// ==================== Enums ====================

export enum MarketplaceItemType {
  INSURANCE_PRODUCT = 'INSURANCE_PRODUCT',
  LEAD_PACKAGE = 'LEAD_PACKAGE',
  SERVICE = 'SERVICE',
  TRAINING = 'TRAINING',
  TOOL = 'TOOL',
}

export enum MarketplaceItemStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  PURCHASE = 'PURCHASE',
  BID = 'BID',
  SUBSCRIPTION = 'SUBSCRIPTION',
  RENTAL = 'RENTAL',
}

export enum VendorStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
  BLACKLISTED = 'BLACKLISTED',
}

export enum VendorTier {
  BASIC = 'BASIC',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

// ==================== Marketplace Item ====================

export interface MarketplaceItem {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  type: MarketplaceItemType;
  status: MarketplaceItemStatus;
  price: number;
  currency: string;
  images: string[];
  tags: string[];
  category: string;
  subcategory?: string;
  specifications: Record<string, unknown>;
  inventory?: number;
  featured: boolean;
  views: number;
  purchases: number;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMarketplaceItemDto {
  vendorId: string;
  title: string;
  description: string;
  type: MarketplaceItemType;
  price: number;
  currency: string;
  images?: string[];
  tags?: string[];
  category: string;
  subcategory?: string;
  specifications?: Record<string, unknown>;
  inventory?: number;
}

export interface UpdateMarketplaceItemDto {
  title?: string;
  description?: string;
  price?: number;
  images?: string[];
  tags?: string[];
  category?: string;
  subcategory?: string;
  specifications?: Record<string, unknown>;
  inventory?: number;
  status?: MarketplaceItemStatus;
  featured?: boolean;
}

export interface MarketplaceSearchFilters {
  type?: MarketplaceItemType;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  vendorId?: string;
  featured?: boolean;
  minRating?: number;
  status?: MarketplaceItemStatus;
}

export interface MarketplaceSearchResult {
  items: MarketplaceItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== Marketplace Vendor ====================

export interface MarketplaceVendor {
  id: string;
  userId: string;
  businessName: string;
  description: string;
  logo?: string;
  website?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  status: VendorStatus;
  tier: VendorTier;
  rating: number;
  reviewCount: number;
  totalSales: number;
  totalRevenue: number;
  commissionRate: number;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVendorDto {
  userId: string;
  businessName: string;
  description: string;
  logo?: string;
  website?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface UpdateVendorDto {
  businessName?: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  status?: VendorStatus;
  tier?: VendorTier;
}

export interface VendorPerformanceMetrics {
  vendorId: string;
  period: string; // e.g., "2024-01"
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  returnRate: number;
  customerSatisfaction: number;
  responseTime: number; // in hours
  fulfillmentRate: number;
}

// ==================== Marketplace Transaction ====================

export interface MarketplaceTransaction {
  id: string;
  itemId: string;
  vendorId: string;
  buyerId: string;
  type: TransactionType;
  status: TransactionStatus;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  commissionAmount: number;
  vendorPayout: number;
  paymentMethod?: string;
  paymentReference?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateTransactionDto {
  itemId: string;
  buyerId: string;
  type: TransactionType;
  quantity: number;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTransactionDto {
  status?: TransactionStatus;
  paymentReference?: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalRevenue: number;
  averageTransactionValue: number;
  successRate: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
}

// ==================== Marketplace Review ====================

export interface MarketplaceReview {
  id: string;
  itemId?: string;
  vendorId?: string;
  userId: string;
  transactionId?: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  verified: boolean;
  helpful: number;
  reported: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewDto {
  itemId?: string;
  vendorId?: string;
  transactionId?: string;
  rating: number;
  title: string;
  comment: string;
  pros?: string[];
  cons?: string[];
}

export interface UpdateReviewDto {
  rating?: number;
  title?: string;
  comment?: string;
  pros?: string[];
  cons?: string[];
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPercentage: number;
}

// ==================== Marketplace Analytics ====================

export interface MarketplaceAnalytics {
  overview: MarketplaceOverview;
  topItems: MarketplaceItem[];
  topVendors: MarketplaceVendor[];
  revenueByCategory: Record<string, number>;
  salesTrend: SalesTrendData[];
  conversionFunnel: ConversionFunnelData;
}

export interface MarketplaceOverview {
  totalItems: number;
  activeItems: number;
  totalVendors: number;
  activeVendors: number;
  totalTransactions: number;
  totalRevenue: number;
  averageItemPrice: number;
  averageRating: number;
}

export interface SalesTrendData {
  date: string;
  sales: number;
  revenue: number;
  transactions: number;
}

export interface ConversionFunnelData {
  views: number;
  clicks: number;
  addedToCart: number;
  initiated: number;
  completed: number;
  conversionRate: number;
}

// ==================== Marketplace Category ====================

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  parentId?: string;
  itemCount: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDto {
  name: string;
  slug: string;
  description: string;
  icon?: string;
  parentId?: string;
  displayOrder?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
}

// ==================== Wishlist ====================

export interface Wishlist {
  id: string;
  userId: string;
  itemId: string;
  addedAt: Date;
}

export interface CreateWishlistDto {
  userId: string;
  itemId: string;
}

// ==================== Cart ====================

export interface CartItem {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  addedAt: Date;
  updatedAt: Date;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  estimatedTotal: number;
}

export interface AddToCartDto {
  userId: string;
  itemId: string;
  quantity: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}

// ==================== Marketplace Commission ====================

export interface CommissionRule {
  id: string;
  vendorTier: VendorTier;
  itemType: MarketplaceItemType;
  commissionRate: number;
  minimumAmount?: number;
  maximumAmount?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommissionRuleDto {
  vendorTier: VendorTier;
  itemType: MarketplaceItemType;
  commissionRate: number;
  minimumAmount?: number;
  maximumAmount?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface UpdateCommissionRuleDto {
  commissionRate?: number;
  minimumAmount?: number;
  maximumAmount?: number;
  effectiveTo?: Date;
  isActive?: boolean;
}

// ==================== Vendor Payout ====================

export interface VendorPayout {
  id: string;
  vendorId: string;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  commissionAmount: number;
  payoutAmount: number;
  transactionCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  paymentMethod?: string;
  paymentReference?: string;
  processedAt?: Date;
  createdAt: Date;
}

export interface CreateVendorPayoutDto {
  vendorId: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface VendorPayoutSummary {
  totalPayouts: number;
  pendingAmount: number;
  completedAmount: number;
  nextPayoutDate: Date;
  recentPayouts: VendorPayout[];
}
