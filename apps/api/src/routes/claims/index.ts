import express, { Request, Response } from 'express';
import multer from 'multer';
import { 
  ClaimService, 
  AdjusterService, 
  DocumentService, 
  PaymentService 
} from '@insurance/core/claims';
import { CreateClaimDto, UpdateClaimDto, ClaimFilterParams } from '@insurance/types/claims';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'video/mp4',
      'video/avi',
      'video/mov',
      'audio/mp3',
      'audio/wav'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const router = express.Router();

// Initialize services
const claimService = new ClaimService();
const adjusterService = new AdjusterService();
const documentService = new DocumentService();
const paymentService = new PaymentService();

// ========================================
// CLAIMS INTROSPECTION & LIFECYCLE
// ========================================

/**
 * POST /api/claims
 * Create a new claim
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const claimData: CreateClaimDto = req.body;
    
    // Add user context
    const enrichedData = {
      ...claimData,
      createdBy: req.user?.id,
      reportedById: req.user?.id
    };
    
    const result = await claimService.createClaim(enrichedData);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating claim:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/claims
 * Get claims with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: ClaimFilterParams = {
      claimNumber: req.query.claimNumber as string,
      claimType: req.query.claimType as any,
      status: req.query.status as any,
      policyId: req.query.policyId as string,
      insuredId: req.query.insuredId as string,
      carrierId: req.query.carrierId as string,
      lossDateFrom: req.query.lossDateFrom ? new Date(req.query.lossDateFrom as string) : undefined,
      lossDateTo: req.query.lossDateTo ? new Date(req.query.lossDateTo as string) : undefined,
      reportedDateFrom: req.query.reportedDateFrom ? new Date(req.query.reportedDateFrom as string) : undefined,
      reportedDateTo: req.query.reportedDateTo ? new Date(req.query.reportedDateTo as string) : undefined,
      claimedAmountMin: req.query.claimedAmountMin ? parseFloat(req.query.claimedAmountMin as string) : undefined,
      claimedAmountMax: req.query.claimedAmountMax ? parseFloat(req.query.claimedAmountMax as string) : undefined,
      riskLevel: req.query.riskLevel as any,
      fraudIndicator: req.query.fraudIndicator === 'true',
      thirdPartyInvolved: req.query.thirdPartyInvolved === 'true',
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc'
    };
    
    const result = await claimService.getClaims(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error retrieving claims:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/claims/:id
 * Get a specific claim by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await claimService.getClaimById(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error retrieving claim:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/claims/:id
 * Update a claim
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updateData: UpdateClaimDto = req.body;
    
    // Add user context
    const enrichedData = {
      ...updateData,
      updatedBy: req.user?.id
    };
    
    const result = await claimService.updateClaim(req.params.id, enrichedData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error updating claim:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/claims/:id/status
 * Change claim status
 */
router.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, reason } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    const result = await claimService.changeClaimStatus(
      req.params.id,
      status,
      reason,
      req.user?.id
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error changing claim status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/claims/:id/status-history
 * Get claim status history
 */
router.get('/:id/status-history', async (req: Request, res: Response) => {
  try {
    const history = await claimService.getClaimStatusHistory(req.params.id);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error retrieving status history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/claims/:id/submit-to-carrier
 * Submit claim to carrier
 */
router.post('/:id/submit-to-carrier', async (req: Request, res: Response) => {
  try {
    const result = await claimService.submitToCarrier(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error submitting to carrier:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ========================================
// ADJUSTER MANAGEMENT
// ========================================

/**
 * POST /api/adjusters
 * Create a new adjuster
 */
router.post('/adjusters', async (req: Request, res: Response) => {
  try {
    const result = await adjusterService.createAdjuster(req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating adjuster:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/adjusters
 * Get all adjusters
 */
router.get('/adjusters', async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as any,
      adjusterType: req.query.adjusterType as string,
      carrierId: req.query.carrierId as string,
      expertiseAreas: req.query.expertiseAreas ? (req.query.expertiseAreas as string).split(',') : undefined,
      available: req.query.available === 'true',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };
    
    const result = await adjusterService.getAdjusters(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error retrieving adjusters:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/adjusters/:id
 * Get specific adjuster
 */
router.get('/adjusters/:id', async (req: Request, res: Response) => {
  try {
    const result = await adjusterService.getAdjuster(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error retrieving adjuster:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/adjusters/:id
 * Update adjuster
 */
router.put('/adjusters/:id', async (req: Request, res: Response) => {
  try {
    const result = await adjusterService.updateAdjuster(req.params.id, req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error updating adjuster:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/claims/:id/assign-adjuster
 * Assign adjuster to claim
 */
router.post('/claims/:id/assign-adjuster', async (req: Request, res: Response) => {
  try {
    const result = await adjusterService.assignClaim(req.params.id, req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error assigning adjuster:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/claims/:id/reassign-adjuster
 * Reassign claim to different adjuster
 */
router.post('/claims/:id/reassign-adjuster', async (req: Request, res: Response) => {
  try {
    const { newAdjusterId, reason } = req.body;
    
    if (!newAdjusterId) {
      return res.status(400).json({
        success: false,
        error: 'New adjuster ID is required'
      });
    }
    
    const result = await adjusterService.reassignClaim(req.params.id, newAdjusterId, reason);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error reassigning adjuster:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/adjusters/:id/assigned-claims
 * Get adjuster's assigned claims
 */
router.get('/adjusters/:id/assigned-claims', async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as any,
      priority: req.query.priority as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };
    
    const result = await adjusterService.getAdjusterClaims(req.params.id, filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error retrieving adjuster claims:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/claims/:id/recommend-adjuster
 * Get adjuster recommendations for a claim
 */
router.post('/claims/:id/recommend-adjuster', async (req: Request, res: Response) => {
  try {
    const { adjusterIds, complexity, location } = req.body;
    
    if (!adjusterIds || !Array.isArray(adjusterIds)) {
      return res.status(400).json({
        success: false,
        error: 'Adjuster IDs array is required'
      });
    }
    
    const request = {
      claimId: req.params.id,
      adjusterIds,
      complexity,
      location
    };
    
    const result = await adjusterService.recommendAdjuster(request);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error recommending adjuster:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/adjusters/:id/performance-metrics
 * Get adjuster performance metrics
 */
router.get('/adjusters/:id/performance-metrics', async (req: Request, res: Response) => {
  try {
    const period = req.query.from && req.query.to ? {
      from: new Date(req.query.from as string),
      to: new Date(req.query.to as string)
    } : undefined;
    
    const result = await adjusterService.getPerformanceMetrics(req.params.id, period);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error retrieving adjuster metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ========================================
// DOCUMENT MANAGEMENT
// ========================================

/**
 * POST /api/claims/:id/documents
 * Upload document to claim
 */
router.post('/claims/:id/documents', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File is required'
      });
    }
    
    const uploadData = {
      claimId: req.params.id,
      documentType: req.body.documentType,
      documentName: req.body.documentName || req.file.originalname,
      description: req.body.description,
      isSharedWithInsured: req.body.isSharedWithInsured === 'true',
      isSharedWithCarrier: req.body.isSharedWithCarrier === 'true',
      isConfidential: req.body.isConfidential === 'true'
    };
    
    const result = await documentService.uploadDocument(
      req.file,
      uploadData,
      req.user?.id || 'system',
      req.body.uploadedByType || 'ADJUSTER',
      req.ip
    );
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/claims/:id/documents
 * Get documents for a claim
 */
router.get('/claims/:id/documents', async (req: Request, res: Response) => {
  try {
    const result = await documentService.getClaimDocuments(
      req.params.id,
      req.user?.id,
      req.user?.role === 'INSURED' ? 'INSURED' : 'ADJUSTER'
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error retrieving documents:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/claims/:id/documents/:docId/download
 * Download document
 */
router.get('/claims/:id/documents/:docId/download', async (req: Request, res: Response) => {
  try {
    const result = await documentService.downloadDocument(
      req.params.docId,
      req.user?.id || 'anonymous',
      req.user?.role === 'INSURED' ? 'INSURED' : 'ADJUSTER',
      req.ip
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(403).json(result);
    }
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/claims/:id/documents/:docId/share
 * Share document
 */
router.post('/claims/:id/documents/:docId/share', async (req: Request, res: Response) => {
  try {
    const { sharedWith, shareType } = req.body;
    
    if (!sharedWith || !shareType) {
      return res.status(400).json({
        success: false,
        error: 'SharedWith and shareType are required'
      });
    }
    
    const result = await documentService.shareDocument(
      req.params.docId,
      sharedWith,
      shareType,
      req.user?.id || 'system'
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error sharing document:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/claims/:id/documents/:docId
 * Delete document
 */
router.delete('/claims/:id/documents/:docId', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    
    const result = await documentService.deleteDocument(
      req.params.docId,
      req.user?.id || 'system',
      reason
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/claims/:id/documents/access-log
 * Get document access log
 */
router.get('/claims/:id/documents/access-log', async (req: Request, res: Response) => {
  try {
    const result = await documentService.getDocumentAccessLog(
      req.params.id,
      req.user?.id
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error retrieving access log:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ========================================
// PAYMENT & SETTLEMENT MANAGEMENT
// ========================================

/**
 * POST /api/claims/:id/payments
 * Create payment request
 */
router.post('/claims/:id/payments', async (req: Request, res: Response) => {
  try {
    const paymentData = {
      ...req.body,
      claimId: req.params.id
    };
    
    const result = await paymentService.createPayment(paymentData);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/claims/:id/payments
 * Get payments for a claim
 */
router.get('/claims/:id/payments', async (req: Request, res: Response) => {
  try {
    const filters = {
      paymentStatus: req.query.paymentStatus as any,
      paymentType: req.query.paymentType as any,
      payeeType: req.query.payeeType as any
    };
    
    const result = await paymentService.getClaimPayments(req.params.id, filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error retrieving payments:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/claims/:id/payments/:paymentId
 * Update payment status
 */
router.put('/claims/:id/payments/:paymentId', async (req: Request, res: Response) => {
  try {
    const { status, ...updateData } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    const result = await paymentService.updatePaymentStatus(
      req.params.paymentId,
      status,
      updateData,
      req.user?.id
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/claims/:id/settlement
 * Create settlement
 */
router.post('/claims/:id/settlement', async (req: Request, res: Response) => {
  try {
    const settlementData = {
      ...req.body,
      claimId: req.params.id
    };
    
    const result = await paymentService.createSettlement(settlementData);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating settlement:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/claims/:id/settlement
 * Get settlement for a claim
 */
router.get('/claims/:id/settlement', async (req: Request, res: Response) => {
  try {
    // This would be implemented in the service
    res.json({
      success: true,
      data: null // Placeholder
    });
  } catch (error) {
    console.error('Error retrieving settlement:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/claims/:id/settlement/:settlementId/accept
 * Accept settlement
 */
router.post('/claims/:id/settlement/:settlementId/accept', async (req: Request, res: Response) => {
  try {
    const result = await paymentService.acceptSettlement(
      req.params.settlementId,
      req.user?.id || 'system',
      req.user?.role === 'INSURED' ? 'INSURED' : 'ADJUSTER'
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error accepting settlement:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ========================================
// CLAIMS SEARCH & FILTERING
// ========================================

/**
 * POST /api/claims/search
 * Execute advanced claims search
 */
router.post('/claims/search', async (req: Request, res: Response) => {
  try {
    const searchParams: ClaimFilterParams = {
      ...req.body,
      page: req.body.page || 1,
      limit: req.body.limit || 20
    };
    
    const result = await claimService.getClaims(searchParams);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error executing search:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/claims/search/filters
 * Get available filter options
 */
router.get('/claims/search/filters', async (req: Request, res: Response) => {
  try {
    const filters = {
      claimTypes: ['COLLISION', 'THEFT', 'LIABILITY', 'COMPREHENSIVE', 'PROPERTY', 'CASUALTY', 'OTHER'],
      statuses: ['REPORTED', 'ASSIGNED', 'INVESTIGATING', 'APPROVED', 'DENIED', 'APPEALED', 'SETTLED', 'CLOSED', 'ARCHIVED'],
      riskLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      reportChannels: ['PHONE', 'EMAIL', 'WEB_PORTAL', 'MOBILE_APP', 'THIRD_PARTY', 'API'],
      paymentStatuses: ['REQUESTED', 'APPROVED', 'PENDING', 'SENT', 'RECEIVED', 'FAILED', 'CANCELLED'],
      documentTypes: ['LOSS_OF_USE', 'REPAIR_ESTIMATE', 'POLICE_REPORT', 'PHOTOS', 'MEDICAL_RECORDS', 'INVOICES', 'RECEIPTS', 'CORRESPONDENCE', 'SETTLEMENT_AGREEMENT', 'DENIAL_LETTER', 'OTHER']
    };
    
    res.json({
      success: true,
      data: filters
    });
  } catch (error) {
    console.error('Error retrieving filter options:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ========================================
// POLICY & INSURED ENDPOINTS
// ========================================

/**
 * GET /api/policies/:policyId/claims
 * Get claims for a specific policy
 */
router.get('/policies/:policyId/claims', async (req: Request, res: Response) => {
  try {
    const filters: ClaimFilterParams = {
      policyId: req.params.policyId,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };
    
    const result = await claimService.getClaims(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error retrieving policy claims:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/insured/:insuredId/claims
 * Get claims for a specific insured
 */
router.get('/insured/:insuredId/claims', async (req: Request, res: Response) => {
  try {
    const filters: ClaimFilterParams = {
      insuredId: req.params.insuredId,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };
    
    const result = await claimService.getClaims(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error retrieving insured claims:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;