import { AgentConfigurationService } from '../agent-configuration.service';
import type { CreateAgentAvailabilityDto, CreateAgentLeadPreferencesDto } from '@insurance-lead-gen/types';

describe('AgentConfigurationService', () => {
  let service: AgentConfigurationService;
  const testAgentId = 'agent_test_123';

  beforeEach(() => {
    service = new AgentConfigurationService();
  });

  describe('Availability Management', () => {
    it('should create agent availability', async () => {
      const dto: CreateAgentAvailabilityDto = {
        workHours: [
          {
            dayOfWeek: 'monday',
            startTime: '09:00',
            endTime: '17:00',
            isEnabled: true,
          },
        ],
        autoAcceptLeads: false,
        maxConcurrentLeads: 10,
      };

      const availability = await service.createAvailability(testAgentId, dto);

      expect(availability).toBeDefined();
      expect(availability.agentId).toBe(testAgentId);
      expect(availability.workHours).toHaveLength(1);
      expect(availability.status).toBe('available');
    });

    it('should update agent availability', async () => {
      // First create
      await service.createAvailability(testAgentId, {
        workHours: [
          {
            dayOfWeek: 'monday',
            startTime: '09:00',
            endTime: '17:00',
            isEnabled: true,
          },
        ],
      });

      // Then update
      const updated = await service.updateAvailability(testAgentId, {
        status: 'busy',
        maxConcurrentLeads: 5,
      });

      expect(updated.status).toBe('busy');
      expect(updated.maxConcurrentLeads).toBe(5);
    });

    it('should get agent availability', async () => {
      const dto: CreateAgentAvailabilityDto = {
        workHours: [
          {
            dayOfWeek: 'tuesday',
            startTime: '08:00',
            endTime: '16:00',
            isEnabled: true,
          },
        ],
      };

      await service.createAvailability(testAgentId, dto);
      const availability = await service.getAvailability(testAgentId);

      expect(availability).toBeDefined();
      expect(availability?.agentId).toBe(testAgentId);
    });
  });

  describe('Lead Preferences', () => {
    it('should create lead preferences', async () => {
      const dto: CreateAgentLeadPreferencesDto = {
        insuranceTypes: {
          auto: 'preferred',
          home: 'neutral',
          life: 'avoid',
        },
        minLeadQualityScore: 60,
        maxLeadQualityScore: 100,
      };

      const preferences = await service.createLeadPreferences(testAgentId, dto);

      expect(preferences).toBeDefined();
      expect(preferences.agentId).toBe(testAgentId);
      expect(preferences.insuranceTypes.auto).toBe('preferred');
      expect(preferences.minLeadQualityScore).toBe(60);
    });

    it('should check if lead matches preferences', async () => {
      await service.createLeadPreferences(testAgentId, {
        insuranceTypes: {
          auto: 'preferred',
          life: 'avoid',
        },
        minLeadQualityScore: 70,
      });

      // Should match - preferred type and good score
      const match1 = await service.doesLeadMatchPreferences(testAgentId, {
        insuranceType: 'auto',
        qualityScore: 85,
      });
      expect(match1.matches).toBe(true);

      // Should not match - avoided type
      const match2 = await service.doesLeadMatchPreferences(testAgentId, {
        insuranceType: 'life',
        qualityScore: 85,
      });
      expect(match2.matches).toBe(false);

      // Should not match - score too low
      const match3 = await service.doesLeadMatchPreferences(testAgentId, {
        insuranceType: 'auto',
        qualityScore: 50,
      });
      expect(match3.matches).toBe(false);
    });
  });

  describe('Certifications', () => {
    it('should add certification', async () => {
      const certification = await service.addCertification(testAgentId, {
        name: 'Licensed Insurance Agent',
        issuingOrganization: 'State Board',
        issueDate: new Date('2024-01-01'),
        expirationDate: new Date('2027-01-01'),
      });

      expect(certification).toBeDefined();
      expect(certification.name).toBe('Licensed Insurance Agent');
      expect(certification.status).toBe('active');
    });

    it('should get certifications', async () => {
      await service.addCertification(testAgentId, {
        name: 'Cert 1',
        issuingOrganization: 'Org 1',
        issueDate: new Date(),
      });

      await service.addCertification(testAgentId, {
        name: 'Cert 2',
        issuingOrganization: 'Org 2',
        issueDate: new Date(),
      });

      const certs = await service.getCertifications(testAgentId);
      expect(certs).toHaveLength(2);
    });
  });

  describe('Skills', () => {
    it('should add skill', async () => {
      const skill = await service.addSkill(testAgentId, {
        skillName: 'Auto Insurance Sales',
        category: 'insurance_type',
        proficiencyLevel: 5,
        yearsOfExperience: 10,
      });

      expect(skill).toBeDefined();
      expect(skill.skillName).toBe('Auto Insurance Sales');
      expect(skill.proficiencyLevel).toBe(5);
      expect(skill.endorsements).toBe(0);
    });

    it('should update skill', async () => {
      const skill = await service.addSkill(testAgentId, {
        skillName: 'Home Insurance',
        category: 'insurance_type',
        proficiencyLevel: 3,
      });

      const updated = await service.updateSkill(skill.id, {
        proficiencyLevel: 4,
        endorsements: 5,
      });

      expect(updated.proficiencyLevel).toBe(4);
      expect(updated.endorsements).toBe(5);
    });
  });

  describe('Complete Configuration', () => {
    it('should initialize default configuration', async () => {
      const config = await service.initializeDefaultConfiguration(testAgentId);

      expect(config).toBeDefined();
      expect(config.agentId).toBe(testAgentId);
      expect(config.availability).toBeDefined();
      expect(config.leadPreferences).toBeDefined();
      expect(config.notificationPreferences).toBeDefined();
      expect(config.profileCustomization).toBeDefined();
      expect(config.performanceThresholds).toBeDefined();

      // Check default work hours (9-5 weekdays)
      expect(config.availability.workHours).toHaveLength(7);
      const monday = config.availability.workHours.find((wh) => wh.dayOfWeek === 'monday');
      expect(monday?.startTime).toBe('09:00');
      expect(monday?.endTime).toBe('17:00');
      expect(monday?.isEnabled).toBe(true);

      // Check default preferences
      expect(config.leadPreferences.minLeadQualityScore).toBe(50);
      expect(config.leadPreferences.insuranceTypes.auto).toBe('neutral');
    });

    it('should get complete configuration', async () => {
      await service.initializeDefaultConfiguration(testAgentId);
      const config = await service.getCompleteConfiguration(testAgentId);

      expect(config).toBeDefined();
      expect(config?.agentId).toBe(testAgentId);
    });
  });
});
