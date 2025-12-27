import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { customerRepository } from './customer-repository';
import type {
  Customer,
  CustomerRegisterRequest,
  CustomerLoginRequest,
  CustomerAuthResponse,
  CustomerUpdateProfileDto,
  ChangePasswordDto,
  CustomerDocumentUpload,
  SendMessageDto,
} from '@insurance/types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = '7d';

export class CustomerService {
  // ========================================
  // AUTHENTICATION
  // ========================================

  async register(data: CustomerRegisterRequest): Promise<CustomerAuthResponse> {
    // Check if customer already exists
    const existingCustomer = await customerRepository.findByEmail(data.email);
    if (existingCustomer) {
      throw new Error('Customer already exists with this email');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create customer
    const customer = await customerRepository.create({
      leadId: data.leadId,
      email: data.email,
      passwordHash,
      phoneNumber: data.phoneNumber,
    });

    // Generate token
    const token = this.generateToken(customer.id);

    return { customer, token };
  }

  async login(data: CustomerLoginRequest): Promise<CustomerAuthResponse> {
    // Find customer by email
    const customer = await customerRepository.findByEmail(data.email);
    if (!customer) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, customer.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await customerRepository.update(customer.id, {
      lastLoginAt: new Date(),
    } as any);

    // Generate token
    const token = this.generateToken(customer.id);

    return { customer, token };
  }

  async verifyToken(token: string): Promise<Customer> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { customerId: string };
      const customer = await customerRepository.findById(decoded.customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      return customer;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async getCustomerById(id: string): Promise<Customer> {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  // ========================================
  // PROFILE MANAGEMENT
  // ========================================

  async updateProfile(customerId: string, data: CustomerUpdateProfileDto): Promise<Customer> {
    let customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Update or create profile
    if (customer.profile) {
      await customerRepository.updateProfile(customerId, data);
    } else {
      await customerRepository.createProfile(customerId, data);
    }

    // Fetch updated customer
    customer = await customerRepository.findById(customerId);
    return customer!;
  }

  async getProfile(customerId: string): Promise<Customer> {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  async changePassword(customerId: string, data: ChangePasswordDto): Promise<void> {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(data.currentPassword, customer.passwordHash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

    // Update password
    await customerRepository.update(customerId, {
      passwordHash: newPasswordHash,
    } as any);
  }

  // ========================================
  // DOCUMENT MANAGEMENT
  // ========================================

  async uploadDocument(customerId: string, data: CustomerDocumentUpload): Promise<Customer> {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // In a real implementation, you would upload the file to cloud storage
    // and get back a URL. For now, we'll use a placeholder.
    const fileUrl = `/uploads/documents/${Date.now()}_${data.fileName}`;

    await customerRepository.createDocument({
      customerId,
      fileName: data.fileName,
      fileUrl,
      fileSize: data.fileData.length,
      mimeType: data.mimeType,
      documentType: data.documentType,
    });

    // Fetch updated customer
    const updatedCustomer = await customerRepository.findById(customerId);
    return updatedCustomer!;
  }

  async getDocuments(customerId: string) {
    return await customerRepository.getDocuments({
      customerId,
    });
  }

  async deleteDocument(customerId: string, documentId: string): Promise<void> {
    const document = await customerRepository.getDocumentById(documentId);
    if (!document || document.customerId !== customerId) {
      throw new Error('Document not found');
    }

    await customerRepository.deleteDocument(documentId);
  }

  // ========================================
  // MESSAGES
  // ========================================

  async sendMessage(customerId: string, data: SendMessageDto): Promise<CustomerMessage> {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return await customerRepository.createMessage({
      customerId,
      agentId: data.agentId,
      senderType: 'customer',
      subject: data.subject,
      message: data.message,
    });
  }

  async getMessages(customerId: string) {
    return await customerRepository.getMessages({
      customerId,
    });
  }

  async markMessageAsRead(customerId: string, messageId: string): Promise<CustomerMessage> {
    const message = await customerRepository.getMessageById(messageId);
    if (!message || message.customerId !== customerId) {
      throw new Error('Message not found');
    }

    return await customerRepository.markAsRead(messageId);
  }

  async markAllMessagesAsRead(customerId: string): Promise<void> {
    await customerRepository.markAllAsRead(customerId);
  }

  // ========================================
  // DASHBOARD DATA
  // ========================================

  async getDashboard(customerId: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get lead info
    const lead = customer.lead;

    // Get pending documents
    const documents = await customerRepository.getDocuments({
      customerId,
      status: 'pending',
    });

    // Get unread messages
    const messages = await customerRepository.getMessages({
      customerId,
      isRead: false,
    });

    return {
      customer,
      lead,
      pendingDocuments: documents.total,
      unreadMessages: messages.total,
    };
  }

  // ========================================
  // HELPERS
  // ========================================

  private generateToken(customerId: string): string {
    return jwt.sign({ customerId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }
}

export const customerService = new CustomerService();
