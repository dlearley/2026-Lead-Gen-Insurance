import { PrismaClient } from '@prisma/client';
import {
  Customer,
  CustomerProfile,
  CustomerDocument,
  CustomerMessage,
  CustomerFilterParams,
  CustomerDocumentFilterParams,
  CustomerMessageFilterParams,
} from '@insurance/types';

const prisma = new PrismaClient();

export class CustomerRepository {
  // ========================================
  // CUSTOMER CRUD
  // ========================================

  async findById(id: string): Promise<Customer | null> {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        lead: true,
        profile: true,
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) return null;

    return this.mapToCustomer(customer);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const customer = await prisma.customer.findUnique({
      where: { email },
      include: {
        lead: true,
        profile: true,
        documents: true,
      },
    });

    if (!customer) return null;

    return this.mapToCustomer(customer);
  }

  async findByLeadId(leadId: string): Promise<Customer | null> {
    const customer = await prisma.customer.findUnique({
      where: { leadId },
      include: {
        lead: true,
        profile: true,
        documents: true,
      },
    });

    if (!customer) return null;

    return this.mapToCustomer(customer);
  }

  async create(data: {
    leadId: string;
    email: string;
    passwordHash: string;
    phoneNumber?: string;
  }): Promise<Customer> {
    const customer = await prisma.customer.create({
      data: {
        leadId: data.leadId,
        email: data.email,
        passwordHash: data.passwordHash,
        phoneNumber: data.phoneNumber,
      },
      include: {
        lead: true,
        profile: true,
        documents: true,
      },
    });

    return this.mapToCustomer(customer);
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        phoneNumber: data.phoneNumber,
        isVerified: data.isVerified,
        lastLoginAt: data.lastLoginAt,
      },
      include: {
        lead: true,
        profile: true,
        documents: true,
      },
    });

    return this.mapToCustomer(customer);
  }

  async delete(id: string): Promise<void> {
    await prisma.customer.delete({
      where: { id },
    });
  }

  async list(filters?: CustomerFilterParams): Promise<{ customers: Customer[]; total: number }> {
    const where: any = {};

    if (filters?.customerId) {
      where.id = filters.customerId;
    }
    if (filters?.leadId) {
      where.leadId = filters.leadId;
    }
    if (filters?.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }
    if (filters?.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          lead: true,
          profile: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: ((filters?.page || 1) - 1) * (filters?.limit || 20),
        take: filters?.limit || 20,
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers: customers.map((c) => this.mapToCustomer(c)),
      total,
    };
  }

  // ========================================
  // CUSTOMER PROFILE
  // ========================================

  async getProfile(customerId: string): Promise<CustomerProfile | null> {
    const profile = await prisma.customerProfile.findUnique({
      where: { customerId },
    });

    if (!profile) return null;

    return this.mapToProfile(profile);
  }

  async createProfile(customerId: string, data: Partial<CustomerProfile>): Promise<CustomerProfile> {
    const profile = await prisma.customerProfile.create({
      data: {
        customerId,
        dateOfBirth: data.dateOfBirth,
        preferredContact: data.preferredContact || 'email',
        address: data.address as any,
        emergencyContact: data.emergencyContact as any,
        preferences: data.preferences as any,
      },
    });

    return this.mapToProfile(profile);
  }

  async updateProfile(customerId: string, data: Partial<CustomerProfile>): Promise<CustomerProfile> {
    const profile = await prisma.customerProfile.update({
      where: { customerId },
      data: {
        dateOfBirth: data.dateOfBirth,
        preferredContact: data.preferredContact,
        address: data.address as any,
        emergencyContact: data.emergencyContact as any,
        preferences: data.preferences as any,
      },
    });

    return this.mapToProfile(profile);
  }

  // ========================================
  // CUSTOMER DOCUMENTS
  // ========================================

  async getDocuments(filters?: CustomerDocumentFilterParams): Promise<{
    documents: CustomerDocument[];
    total: number;
  }> {
    const where: any = {};

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.documentType) {
      where.documentType = filters.documentType;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [documents, total] = await Promise.all([
      prisma.customerDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: ((filters?.page || 1) - 1) * (filters?.limit || 20),
        take: filters?.limit || 20,
      }),
      prisma.customerDocument.count({ where }),
    ]);

    return {
      documents: documents.map((d) => this.mapToDocument(d)),
      total,
    };
  }

  async getDocumentById(id: string): Promise<CustomerDocument | null> {
    const document = await prisma.customerDocument.findUnique({
      where: { id },
    });

    if (!document) return null;

    return this.mapToDocument(document);
  }

  async createDocument(data: {
    customerId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    documentType: string;
  }): Promise<CustomerDocument> {
    const document = await prisma.customerDocument.create({
      data,
    });

    return this.mapToDocument(document);
  }

  async updateDocumentStatus(
    id: string,
    status: 'pending' | 'verified' | 'rejected',
    verifiedBy?: string,
    notes?: string,
  ): Promise<CustomerDocument> {
    const document = await prisma.customerDocument.update({
      where: { id },
      data: {
        status,
        verifiedBy,
        verifiedAt: status === 'verified' ? new Date() : null,
        notes,
      },
    });

    return this.mapToDocument(document);
  }

  async deleteDocument(id: string): Promise<void> {
    await prisma.customerDocument.delete({
      where: { id },
    });
  }

  // ========================================
  // CUSTOMER MESSAGES
  // ========================================

  async getMessages(filters?: CustomerMessageFilterParams): Promise<{
    messages: CustomerMessage[];
    total: number;
  }> {
    const where: any = {};

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.agentId) {
      where.agentId = filters.agentId;
    }
    if (filters?.senderType) {
      where.senderType = filters.senderType;
    }
    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [messages, total] = await Promise.all([
      prisma.customerMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: ((filters?.page || 1) - 1) * (filters?.limit || 20),
        take: filters?.limit || 20,
      }),
      prisma.customerMessage.count({ where }),
    ]);

    return {
      messages: messages.map((m) => this.mapToMessage(m)),
      total,
    };
  }

  async getMessageById(id: string): Promise<CustomerMessage | null> {
    const message = await prisma.customerMessage.findUnique({
      where: { id },
    });

    if (!message) return null;

    return this.mapToMessage(message);
  }

  async createMessage(data: {
    customerId: string;
    agentId?: string;
    senderType: 'customer' | 'agent' | 'system';
    subject?: string;
    message: string;
  }): Promise<CustomerMessage> {
    const message = await prisma.customerMessage.create({
      data,
    });

    return this.mapToMessage(message);
  }

  async markAsRead(id: string): Promise<CustomerMessage> {
    const message = await prisma.customerMessage.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.mapToMessage(message);
  }

  async markAllAsRead(customerId: string): Promise<void> {
    await prisma.customerMessage.updateMany({
      where: {
        customerId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // ========================================
  // HELPERS
  // ========================================

  private mapToCustomer(customer: any): Customer {
    return {
      id: customer.id,
      leadId: customer.leadId,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      isVerified: customer.isVerified,
      lastLoginAt: customer.lastLoginAt,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      lead: customer.lead,
      profile: customer.profile ? this.mapToProfile(customer.profile) : undefined,
      documents: customer.documents?.map((d: any) => this.mapToDocument(d)) || [],
    };
  }

  private mapToProfile(profile: any): CustomerProfile {
    return {
      id: profile.id,
      customerId: profile.customerId,
      dateOfBirth: profile.dateOfBirth,
      preferredContact: profile.preferredContact,
      address: profile.address,
      emergencyContact: profile.emergencyContact,
      preferences: profile.preferences,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private mapToDocument(doc: any): CustomerDocument {
    return {
      id: doc.id,
      customerId: doc.customerId,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      documentType: doc.documentType,
      status: doc.status,
      verifiedBy: doc.verifiedBy,
      verifiedAt: doc.verifiedAt,
      notes: doc.notes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapToMessage(msg: any): CustomerMessage {
    return {
      id: msg.id,
      customerId: msg.customerId,
      agentId: msg.agentId,
      senderType: msg.senderType,
      subject: msg.subject,
      message: msg.message,
      isRead: msg.isRead,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
    };
  }
}

export const customerRepository = new CustomerRepository();
