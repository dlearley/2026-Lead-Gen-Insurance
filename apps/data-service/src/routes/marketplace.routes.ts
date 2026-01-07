// Phase 12.6: Marketplace Routes for Data Service
import { Router, Request, Response } from 'express';
import { MarketplaceVendorService } from '../services/marketplace-vendor.service.js';
import { MarketplaceItemService } from '../services/marketplace-item.service.js';
import { MarketplaceTransactionService } from '../services/marketplace-transaction.service.js';
import { MarketplaceReviewService } from '../services/marketplace-review.service.js';
import { MarketplaceAnalyticsService } from '../services/marketplace-analytics.service.js';

const router = Router();

const vendorService = new MarketplaceVendorService();
const itemService = new MarketplaceItemService();
const transactionService = new MarketplaceTransactionService();
const reviewService = new MarketplaceReviewService();
const analyticsService = new MarketplaceAnalyticsService();

// ==================== Vendor Routes ====================

// Create vendor
router.post('/vendors', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    res.status(201).json(vendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get vendor by ID
router.get('/vendors/:id', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor by user ID
router.get('/vendors/user/:userId', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.getVendorByUserId(req.params.userId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update vendor
router.put('/vendors/:id', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body);
    res.json(vendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// List vendors
router.get('/vendors', async (req: Request, res: Response) => {
  try {
    const { status, tier, page, limit } = req.query;
    const result = await vendorService.listVendors({
      status: status as any,
      tier: tier as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve vendor
router.post('/vendors/:id/approve', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.approveVendor(req.params.id);
    res.json(vendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Suspend vendor
router.post('/vendors/:id/suspend', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.suspendVendor(req.params.id);
    res.json(vendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get vendor performance
router.get('/vendors/:id/performance', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const performance = await vendorService.getVendorPerformance(
      req.params.id,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json(performance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete vendor
router.delete('/vendors/:id', async (req: Request, res: Response) => {
  try {
    await vendorService.deleteVendor(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Item Routes ====================

// Create item
router.post('/items', async (req: Request, res: Response) => {
  try {
    const item = await itemService.createItem(req.body);
    res.status(201).json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get item by ID
router.get('/items/:id', async (req: Request, res: Response) => {
  try {
    const item = await itemService.getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update item
router.put('/items/:id', async (req: Request, res: Response) => {
  try {
    const item = await itemService.updateItem(req.params.id, req.body);
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Search items
router.post('/items/search', async (req: Request, res: Response) => {
  try {
    const { filters, page, limit } = req.body;
    const result = await itemService.searchItems(filters, page, limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get featured items
router.get('/items/featured/list', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const items = await itemService.getFeaturedItems(
      limit ? parseInt(limit as string) : undefined
    );
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get items by vendor
router.get('/items/vendor/:vendorId', async (req: Request, res: Response) => {
  try {
    const items = await itemService.getItemsByVendor(req.params.vendorId);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle featured status
router.post('/items/:id/toggle-featured', async (req: Request, res: Response) => {
  try {
    const item = await itemService.toggleFeatured(req.params.id);
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete item
router.delete('/items/:id', async (req: Request, res: Response) => {
  try {
    await itemService.deleteItem(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Transaction Routes ====================

// Create transaction
router.post('/transactions', async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.createTransaction(req.body);
    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get transaction by ID
router.get('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update transaction
router.put('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.updateTransaction(req.params.id, req.body);
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Complete transaction
router.post('/transactions/:id/complete', async (req: Request, res: Response) => {
  try {
    const { paymentReference } = req.body;
    const transaction = await transactionService.completeTransaction(
      req.params.id,
      paymentReference
    );
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Fail transaction
router.post('/transactions/:id/fail', async (req: Request, res: Response) => {
  try {
    const { error } = req.body;
    const transaction = await transactionService.failTransaction(req.params.id, error);
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Refund transaction
router.post('/transactions/:id/refund', async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.refundTransaction(req.params.id);
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get transactions by buyer
router.get('/transactions/buyer/:buyerId', async (req: Request, res: Response) => {
  try {
    const transactions = await transactionService.getTransactionsByBuyer(req.params.buyerId);
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get transactions by vendor
router.get('/transactions/vendor/:vendorId', async (req: Request, res: Response) => {
  try {
    const transactions = await transactionService.getTransactionsByVendor(req.params.vendorId);
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get transaction summary
router.post('/transactions/summary', async (req: Request, res: Response) => {
  try {
    const summary = await transactionService.getTransactionSummary(req.body);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Review Routes ====================

// Create review
router.post('/reviews', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const review = await reviewService.createReview(userId, req.body);
    res.status(201).json(review);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get review by ID
router.get('/reviews/:id', async (req: Request, res: Response) => {
  try {
    const review = await reviewService.getReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(review);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update review
router.put('/reviews/:id', async (req: Request, res: Response) => {
  try {
    const { userId, ...dto } = req.body;
    const review = await reviewService.updateReview(req.params.id, userId, dto);
    res.json(review);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get reviews for item
router.get('/reviews/item/:itemId', async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const result = await reviewService.getReviewsForItem(
      req.params.itemId,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get reviews for vendor
router.get('/reviews/vendor/:vendorId', async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const result = await reviewService.getReviewsForVendor(
      req.params.vendorId,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get item review summary
router.get('/reviews/item/:itemId/summary', async (req: Request, res: Response) => {
  try {
    const summary = await reviewService.getItemReviewSummary(req.params.itemId);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor review summary
router.get('/reviews/vendor/:vendorId/summary', async (req: Request, res: Response) => {
  try {
    const summary = await reviewService.getVendorReviewSummary(req.params.vendorId);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark review as helpful
router.post('/reviews/:id/helpful', async (req: Request, res: Response) => {
  try {
    const review = await reviewService.markHelpful(req.params.id);
    res.json(review);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Report review
router.post('/reviews/:id/report', async (req: Request, res: Response) => {
  try {
    const review = await reviewService.reportReview(req.params.id);
    res.json(review);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete review
router.delete('/reviews/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    await reviewService.deleteReview(req.params.id, userId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Analytics Routes ====================

// Get marketplace analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = await analyticsService.getMarketplaceAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get marketplace overview
router.get('/analytics/overview', async (req: Request, res: Response) => {
  try {
    const overview = await analyticsService.getOverview();
    res.json(overview);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get top items
router.get('/analytics/top-items', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const items = await analyticsService.getTopItems(
      limit ? parseInt(limit as string) : undefined
    );
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get top vendors
router.get('/analytics/top-vendors', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const vendors = await analyticsService.getTopVendors(
      limit ? parseInt(limit as string) : undefined
    );
    res.json(vendors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get category performance
router.get('/analytics/category/:category', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const performance = await analyticsService.getCategoryPerformance(
      req.params.category,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json(performance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
