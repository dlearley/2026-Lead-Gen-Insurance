import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { LeadRepository } from '../repositories/lead.repository.js';
import { logger } from '@insurance-lead-gen/core';

describe('LeadRepository Tests', () => {
  let prisma: PrismaClient;
  let leadRepository: LeadRepository;

  beforeAll(async () => {
    prisma = new PrismaClient();
    leadRepository = new LeadRepository(prisma);
    
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to test database');
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.lead.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });
    
    // Disconnect from database
    await prisma.$disconnect();
    logger.info('Disconnected from test database');
  });

  describe('Lead Creation', () => {
    it('should create a new lead', async () => {
      const leadData = {
        source: 'test',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '555-123-4567',
        city: 'Test City',
        state: 'TS',
        country: 'US',
        status: 'RECEIVED',
      };

      const lead = await leadRepository.createLead(leadData);

      expect(lead).toHaveProperty('id');
      expect(lead.email).toBe('test@example.com');
      expect(lead.status).toBe('RECEIVED');
      expect(lead.createdAt).toBeInstanceOf(Date);
    });

    it('should handle missing optional fields', async () => {
      const leadData = {
        source: 'test',
        status: 'RECEIVED',
      };

      const lead = await leadRepository.createLead(leadData);

      expect(lead).toHaveProperty('id');
      expect(lead.source).toBe('test');
      expect(lead.email).toBeNull();
      expect(lead.phone).toBeNull();
    });
  });

  describe('Lead Retrieval', () => {
    it('should retrieve a lead by ID', async () => {
      // First create a lead
      const leadData = {
        source: 'test-retrieval',
        email: 'retrieval-test@example.com',
        status: 'RECEIVED',
      };

      const createdLead = await leadRepository.createLead(leadData);

      // Now retrieve it
      const retrievedLead = await leadRepository.getLeadById(createdLead.id);

      expect(retrievedLead).not.toBeNull();
      expect(retrievedLead?.id).toBe(createdLead.id);
      expect(retrievedLead?.email).toBe('retrieval-test@example.com');
    });

    it('should return null for non-existent lead', async () => {
      const nonExistentLead = await leadRepository.getLeadById('non-existent-id');
      expect(nonExistentLead).toBeNull();
    });
  });

  describe('Lead Update', () => {
    it('should update lead information', async () => {
      // Create a lead
      const leadData = {
        source: 'test-update',
        email: 'update-test@example.com',
        status: 'RECEIVED',
      };

      const createdLead = await leadRepository.createLead(leadData);

      // Update the lead
      const updatedLead = await leadRepository.updateLead(createdLead.id, {
        status: 'PROCESSING',
        qualityScore: 75,
      });

      expect(updatedLead.status).toBe('PROCESSING');
      expect(updatedLead.qualityScore).toBe(75);
    });
  });
});