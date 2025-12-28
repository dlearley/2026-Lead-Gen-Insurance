import express from 'express';
import { customerService } from '../services/customer-service';
import { customerRepository } from '../services/customer-repository';
import type {
  CustomerRegisterRequest,
  CustomerLoginRequest,
  CustomerUpdateProfileDto,
  ChangePasswordDto,
  CustomerDocumentUpload,
  SendMessageDto,
} from '@insurance/types';

const router = express.Router();

// ========================================
// MIDDLEWARE
// ========================================

const authenticateCustomer = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7);
    const customer = await customerService.verifyToken(token);
    (req as any).customer = customer;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

// ========================================
// AUTHENTICATION ROUTES
// ========================================

/**
 * @route   POST /api/customers/register
 * @desc    Register a new customer
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const data: CustomerRegisterRequest = req.body;

    // Validate required fields
    if (!data.leadId || !data.email || !data.password) {
      return res.status(400).json({ error: 'leadId, email, and password are required' });
    }

    const result = await customerService.register(data);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   POST /api/customers/login
 * @desc    Login customer
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const data: CustomerLoginRequest = req.body;

    // Validate required fields
    if (!data.email || !data.password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await customerService.login(data);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * @route   GET /api/customers/me
 * @desc    Get current customer
 * @access  Private
 */
router.get('/me', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// PROFILE ROUTES
// ========================================

/**
 * @route   GET /api/customers/profile
 * @desc    Get customer profile
 * @access  Private
 */
router.get('/profile', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    const profile = await customerService.getProfile(customer.id);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/customers/profile
 * @desc    Update customer profile
 * @access  Private
 */
router.put('/profile', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    const data: CustomerUpdateProfileDto = req.body;

    const updatedCustomer = await customerService.updateProfile(customer.id, data);
    res.json(updatedCustomer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   POST /api/customers/change-password
 * @desc    Change customer password
 * @access  Private
 */
router.post('/change-password', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    const data: ChangePasswordDto = req.body;

    // Validate required fields
    if (!data.currentPassword || !data.newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }

    await customerService.changePassword(customer.id, data);
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ========================================
// DOCUMENT ROUTES
// ========================================

/**
 * @route   GET /api/customers/documents
 * @desc    Get customer documents
 * @access  Private
 */
router.get('/documents', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    const result = await customerService.getDocuments(customer.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/customers/documents
 * @desc    Upload a document
 * @access  Private
 */
router.post('/documents', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    const data: CustomerDocumentUpload = req.body;

    // Validate required fields
    if (!data.fileName || !data.fileData || !data.mimeType || !data.documentType) {
      return res
        .status(400)
        .json({ error: 'fileName, fileData, mimeType, and documentType are required' });
    }

    const updatedCustomer = await customerService.uploadDocument(customer.id, data);
    res.json(updatedCustomer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/customers/documents/:documentId
 * @desc    Delete a document
 * @access  Private
 */
router.delete('/documents/:documentId', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    const { documentId } = req.params;

    await customerService.deleteDocument(customer.id, documentId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ========================================
// MESSAGES ROUTES
// ========================================

/**
 * @route   GET /api/customers/messages
 * @desc    Get customer messages
 * @access  Private
 */
router.get('/messages', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    const result = await customerService.getMessages(customer.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/customers/messages
 * @desc    Send a message
 * @access  Private
 */
router.post('/messages', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    const data: SendMessageDto = req.body;

    // Validate required fields
    if (!data.message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const message = await customerService.sendMessage(customer.id, data);
    res.status(201).json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/customers/messages/:messageId/read
 * @desc    Mark a message as read
 * @access  Private
 */
router.put('/messages/:messageId/read', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    const { messageId } = req.params;

    const message = await customerService.markMessageAsRead(customer.id, messageId);
    res.json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/customers/messages/read-all
 * @desc    Mark all messages as read
 * @access  Private
 */
router.put('/messages/read-all', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    await customerService.markAllMessagesAsRead(customer.id);
    res.json({ message: 'All messages marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// DASHBOARD ROUTES
// ========================================

/**
 * @route   GET /api/customers/dashboard
 * @desc    Get customer dashboard
 * @access  Private
 */
router.get('/dashboard', authenticateCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    const dashboard = await customerService.getDashboard(customer.id);
    res.json(dashboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// ADMIN ROUTES
// ========================================

/**
 * @route   GET /api/customers/admin/customers
 * @desc    Get all customers (admin)
 * @access  Admin
 */
router.get('/admin/customers', async (req, res) => {
  try {
    const { customerId, leadId, email, isVerified, dateFrom, dateTo, search, page, limit } = req.query;

    const filters: any = {
      customerId: customerId as string,
      leadId: leadId as string,
      email: email as string,
      isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const result = await customerRepository.list(filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/customers/admin/customers/:customerId
 * @desc    Get customer by ID (admin)
 * @access  Admin
 */
router.get('/admin/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await customerRepository.findById(customerId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/customers/admin/documents
 * @desc    Get all documents (admin)
 * @access  Admin
 */
router.get('/admin/documents', async (req, res) => {
  try {
    const { customerId, documentType, status, dateFrom, dateTo, page, limit } = req.query;

    const filters: any = {
      customerId: customerId as string,
      documentType: documentType as string,
      status: status as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const result = await customerRepository.getDocuments(filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/customers/admin/documents/:documentId/verify
 * @desc    Verify or reject a document (admin)
 * @access  Admin
 */
router.put('/admin/documents/:documentId/verify', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status, verifiedBy, notes } = req.body;

    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be either verified or rejected' });
    }

    const document = await customerRepository.updateDocumentStatus(
      documentId,
      status,
      verifiedBy,
      notes,
    );

    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
