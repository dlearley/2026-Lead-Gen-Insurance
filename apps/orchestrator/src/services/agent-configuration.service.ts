import { logger } from '@insurance-lead-gen/core';
import type {
  AgentConfiguration,
  AgentAvailability,
  AgentLeadPreferences,
  AgentNotificationPreferences,
  AgentProfileCustomization,
  AgentPerformanceThresholds,
  AgentCertification,
  AgentSkill,
  CreateAgentAvailabilityDto,
  UpdateAgentAvailabilityDto,
  CreateAgentLeadPreferencesDto,
  UpdateAgentLeadPreferencesDto,
  CreateAgentNotificationPreferencesDto,
  UpdateAgentNotificationPreferencesDto,
  CreateAgentProfileCustomizationDto,
  UpdateAgentProfileCustomizationDto,
  CreateAgentCertificationDto,
  UpdateAgentCertificationDto,
  CreateAgentSkillDto,
  UpdateAgentSkillDto,
  CreateAgentPerformanceThresholdsDto,
  UpdateAgentPerformanceThresholdsDto,
  AvailabilityStatus,
  NotificationChannel,
} from '@insurance-lead-gen/types';

/**
 * Agent Configuration Service
 * 
 * Manages agent preferences, settings, availability, and customization.
 * This service provides comprehensive configuration management for insurance agents.
 */
export class AgentConfigurationService {
  private configurations: Map<string, AgentConfiguration> = new Map();
  private availabilities: Map<string, AgentAvailability> = new Map();
  private leadPreferences: Map<string, AgentLeadPreferences> = new Map();
  private notificationPreferences: Map<string, AgentNotificationPreferences> = new Map();
  private profileCustomizations: Map<string, AgentProfileCustomization> = new Map();
  private performanceThresholds: Map<string, AgentPerformanceThresholds> = new Map();
  private certifications: Map<string, AgentCertification[]> = new Map();
  private skills: Map<string, AgentSkill[]> = new Map();

  // ========================================
  // AVAILABILITY MANAGEMENT
  // ========================================

  /**
   * Create agent availability schedule
   */
  async createAvailability(
    agentId: string,
    dto: CreateAgentAvailabilityDto
  ): Promise<AgentAvailability> {
    try {
      const availability: AgentAvailability = {
        id: `avail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        status: dto.status || 'available',
        workHours: dto.workHours,
        breakTimes: dto.breakTimes,
        timeOff: dto.timeOff,
        maxConcurrentLeads: dto.maxConcurrentLeads,
        autoAcceptLeads: dto.autoAcceptLeads ?? false,
        updatedAt: new Date(),
      };

      this.availabilities.set(agentId, availability);

      logger.info('Agent availability created', { agentId, availabilityId: availability.id });
      return availability;
    } catch (error) {
      logger.error('Failed to create agent availability', { agentId, error });
      throw error;
    }
  }

  /**
   * Update agent availability
   */
  async updateAvailability(
    agentId: string,
    dto: UpdateAgentAvailabilityDto
  ): Promise<AgentAvailability> {
    try {
      const existing = this.availabilities.get(agentId);
      if (!existing) {
        throw new Error(`Availability not found for agent ${agentId}`);
      }

      const updated: AgentAvailability = {
        ...existing,
        status: dto.status ?? existing.status,
        workHours: dto.workHours ?? existing.workHours,
        breakTimes: dto.breakTimes ?? existing.breakTimes,
        timeOff: dto.timeOff ?? existing.timeOff,
        maxConcurrentLeads: dto.maxConcurrentLeads ?? existing.maxConcurrentLeads,
        autoAcceptLeads: dto.autoAcceptLeads ?? existing.autoAcceptLeads,
        updatedAt: new Date(),
      };

      this.availabilities.set(agentId, updated);

      logger.info('Agent availability updated', { agentId });
      return updated;
    } catch (error) {
      logger.error('Failed to update agent availability', { agentId, error });
      throw error;
    }
  }

  /**
   * Get agent availability
   */
  async getAvailability(agentId: string): Promise<AgentAvailability | null> {
    return this.availabilities.get(agentId) || null;
  }

  /**
   * Check if agent is currently available
   */
  async isAgentAvailable(agentId: string): Promise<boolean> {
    try {
      const availability = await this.getAvailability(agentId);
      if (!availability || availability.status === 'offline') {
        return false;
      }

      // Check if current time is within work hours
      const now = new Date();
      const dayOfWeek = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][now.getDay()] as any;

      const todayHours = availability.workHours.find(
        (wh) => wh.dayOfWeek === dayOfWeek && wh.isEnabled
      );

      if (!todayHours) {
        return false;
      }

      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;

      const isInWorkHours =
        currentTime >= todayHours.startTime && currentTime <= todayHours.endTime;

      if (!isInWorkHours) {
        return false;
      }

      // Check if in break time
      if (availability.breakTimes) {
        const isInBreak = availability.breakTimes.some(
          (bt) => currentTime >= bt.startTime && currentTime <= bt.endTime
        );
        if (isInBreak) {
          return false;
        }
      }

      // Check if on time off
      if (availability.timeOff) {
        const isOnTimeOff = availability.timeOff.some(
          (to) => now >= to.startDate && now <= to.endDate
        );
        if (isOnTimeOff) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to check agent availability', { agentId, error });
      return false;
    }
  }

  // ========================================
  // LEAD PREFERENCES
  // ========================================

  /**
   * Create agent lead preferences
   */
  async createLeadPreferences(
    agentId: string,
    dto: CreateAgentLeadPreferencesDto
  ): Promise<AgentLeadPreferences> {
    try {
      const preferences: AgentLeadPreferences = {
        id: `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        insuranceTypes: dto.insuranceTypes,
        minLeadQualityScore: dto.minLeadQualityScore,
        maxLeadQualityScore: dto.maxLeadQualityScore,
        preferredLocations: dto.preferredLocations,
        excludedLocations: dto.excludedLocations,
        minBudget: dto.minBudget,
        maxBudget: dto.maxBudget,
        preferredLeadSources: dto.preferredLeadSources,
        excludedLeadSources: dto.excludedLeadSources,
        languages: dto.languages,
        updatedAt: new Date(),
      };

      this.leadPreferences.set(agentId, preferences);

      logger.info('Agent lead preferences created', { agentId });
      return preferences;
    } catch (error) {
      logger.error('Failed to create agent lead preferences', { agentId, error });
      throw error;
    }
  }

  /**
   * Update agent lead preferences
   */
  async updateLeadPreferences(
    agentId: string,
    dto: UpdateAgentLeadPreferencesDto
  ): Promise<AgentLeadPreferences> {
    try {
      const existing = this.leadPreferences.get(agentId);
      if (!existing) {
        throw new Error(`Lead preferences not found for agent ${agentId}`);
      }

      const updated: AgentLeadPreferences = {
        ...existing,
        insuranceTypes: dto.insuranceTypes ?? existing.insuranceTypes,
        minLeadQualityScore: dto.minLeadQualityScore ?? existing.minLeadQualityScore,
        maxLeadQualityScore: dto.maxLeadQualityScore ?? existing.maxLeadQualityScore,
        preferredLocations: dto.preferredLocations ?? existing.preferredLocations,
        excludedLocations: dto.excludedLocations ?? existing.excludedLocations,
        minBudget: dto.minBudget ?? existing.minBudget,
        maxBudget: dto.maxBudget ?? existing.maxBudget,
        preferredLeadSources: dto.preferredLeadSources ?? existing.preferredLeadSources,
        excludedLeadSources: dto.excludedLeadSources ?? existing.excludedLeadSources,
        languages: dto.languages ?? existing.languages,
        updatedAt: new Date(),
      };

      this.leadPreferences.set(agentId, updated);

      logger.info('Agent lead preferences updated', { agentId });
      return updated;
    } catch (error) {
      logger.error('Failed to update agent lead preferences', { agentId, error });
      throw error;
    }
  }

  /**
   * Get agent lead preferences
   */
  async getLeadPreferences(agentId: string): Promise<AgentLeadPreferences | null> {
    return this.leadPreferences.get(agentId) || null;
  }

  /**
   * Check if lead matches agent preferences
   */
  async doesLeadMatchPreferences(
    agentId: string,
    leadData: {
      insuranceType?: string;
      qualityScore?: number;
      location?: string;
      budget?: number;
      source?: string;
    }
  ): Promise<{ matches: boolean; reasons: string[] }> {
    try {
      const preferences = await this.getLeadPreferences(agentId);
      if (!preferences) {
        return { matches: true, reasons: ['No preferences configured'] };
      }

      const reasons: string[] = [];

      // Check insurance type preference
      if (leadData.insuranceType && preferences.insuranceTypes[leadData.insuranceType]) {
        const preference = preferences.insuranceTypes[leadData.insuranceType];
        if (preference === 'avoid') {
          return { matches: false, reasons: ['Insurance type is marked as avoid'] };
        }
      }

      // Check quality score
      if (leadData.qualityScore !== undefined) {
        if (
          preferences.minLeadQualityScore !== undefined &&
          leadData.qualityScore < preferences.minLeadQualityScore
        ) {
          return {
            matches: false,
            reasons: [`Quality score below minimum (${preferences.minLeadQualityScore})`],
          };
        }
        if (
          preferences.maxLeadQualityScore !== undefined &&
          leadData.qualityScore > preferences.maxLeadQualityScore
        ) {
          return {
            matches: false,
            reasons: [`Quality score above maximum (${preferences.maxLeadQualityScore})`],
          };
        }
      }

      // Check location
      if (leadData.location) {
        if (
          preferences.excludedLocations &&
          preferences.excludedLocations.includes(leadData.location)
        ) {
          return { matches: false, reasons: ['Location is excluded'] };
        }
        if (
          preferences.preferredLocations &&
          preferences.preferredLocations.length > 0 &&
          !preferences.preferredLocations.includes(leadData.location)
        ) {
          reasons.push('Location is not in preferred list');
        }
      }

      // Check budget
      if (leadData.budget !== undefined) {
        if (preferences.minBudget !== undefined && leadData.budget < preferences.minBudget) {
          return { matches: false, reasons: [`Budget below minimum (${preferences.minBudget})`] };
        }
        if (preferences.maxBudget !== undefined && leadData.budget > preferences.maxBudget) {
          return { matches: false, reasons: [`Budget above maximum (${preferences.maxBudget})`] };
        }
      }

      // Check source
      if (leadData.source) {
        if (
          preferences.excludedLeadSources &&
          preferences.excludedLeadSources.includes(leadData.source)
        ) {
          return { matches: false, reasons: ['Lead source is excluded'] };
        }
      }

      return { matches: true, reasons };
    } catch (error) {
      logger.error('Failed to check lead preferences match', { agentId, error });
      return { matches: true, reasons: ['Error checking preferences'] };
    }
  }

  // ========================================
  // NOTIFICATION PREFERENCES
  // ========================================

  /**
   * Create agent notification preferences
   */
  async createNotificationPreferences(
    agentId: string,
    dto: CreateAgentNotificationPreferencesDto
  ): Promise<AgentNotificationPreferences> {
    try {
      const defaultChannels: { [key in NotificationChannel]: boolean } = {
        email: true,
        sms: false,
        push: true,
        in_app: true,
      };

      const preferences: AgentNotificationPreferences = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        channels: { ...defaultChannels, ...dto.channels },
        leadAssignment: dto.leadAssignment || {
          enabled: true,
          channels: ['email', 'push'],
        },
        leadUpdates: dto.leadUpdates || {
          enabled: true,
          channels: ['in_app'],
        },
        performanceAlerts: dto.performanceAlerts || {
          enabled: true,
          channels: ['email'],
        },
        systemNotifications: dto.systemNotifications || {
          enabled: true,
          channels: ['in_app'],
        },
        updatedAt: new Date(),
      };

      this.notificationPreferences.set(agentId, preferences);

      logger.info('Agent notification preferences created', { agentId });
      return preferences;
    } catch (error) {
      logger.error('Failed to create agent notification preferences', { agentId, error });
      throw error;
    }
  }

  /**
   * Update agent notification preferences
   */
  async updateNotificationPreferences(
    agentId: string,
    dto: UpdateAgentNotificationPreferencesDto
  ): Promise<AgentNotificationPreferences> {
    try {
      const existing = this.notificationPreferences.get(agentId);
      if (!existing) {
        throw new Error(`Notification preferences not found for agent ${agentId}`);
      }

      const updated: AgentNotificationPreferences = {
        ...existing,
        channels: { ...existing.channels, ...dto.channels },
        leadAssignment: dto.leadAssignment || existing.leadAssignment,
        leadUpdates: dto.leadUpdates || existing.leadUpdates,
        performanceAlerts: dto.performanceAlerts || existing.performanceAlerts,
        systemNotifications: dto.systemNotifications || existing.systemNotifications,
        updatedAt: new Date(),
      };

      this.notificationPreferences.set(agentId, updated);

      logger.info('Agent notification preferences updated', { agentId });
      return updated;
    } catch (error) {
      logger.error('Failed to update agent notification preferences', { agentId, error });
      throw error;
    }
  }

  /**
   * Get agent notification preferences
   */
  async getNotificationPreferences(agentId: string): Promise<AgentNotificationPreferences | null> {
    return this.notificationPreferences.get(agentId) || null;
  }

  // ========================================
  // PROFILE CUSTOMIZATION
  // ========================================

  /**
   * Create agent profile customization
   */
  async createProfileCustomization(
    agentId: string,
    dto: CreateAgentProfileCustomizationDto
  ): Promise<AgentProfileCustomization> {
    try {
      const customization: AgentProfileCustomization = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        bio: dto.bio,
        profileImageUrl: dto.profileImageUrl,
        headline: dto.headline,
        yearsOfExperience: dto.yearsOfExperience,
        languages: dto.languages,
        awards: dto.awards,
        socialLinks: dto.socialLinks,
        videoIntroUrl: dto.videoIntroUrl,
        tagline: dto.tagline,
        updatedAt: new Date(),
      };

      this.profileCustomizations.set(agentId, customization);

      logger.info('Agent profile customization created', { agentId });
      return customization;
    } catch (error) {
      logger.error('Failed to create agent profile customization', { agentId, error });
      throw error;
    }
  }

  /**
   * Update agent profile customization
   */
  async updateProfileCustomization(
    agentId: string,
    dto: UpdateAgentProfileCustomizationDto
  ): Promise<AgentProfileCustomization> {
    try {
      const existing = this.profileCustomizations.get(agentId);
      if (!existing) {
        throw new Error(`Profile customization not found for agent ${agentId}`);
      }

      const updated: AgentProfileCustomization = {
        ...existing,
        bio: dto.bio ?? existing.bio,
        profileImageUrl: dto.profileImageUrl ?? existing.profileImageUrl,
        headline: dto.headline ?? existing.headline,
        yearsOfExperience: dto.yearsOfExperience ?? existing.yearsOfExperience,
        languages: dto.languages ?? existing.languages,
        awards: dto.awards ?? existing.awards,
        socialLinks: dto.socialLinks ?? existing.socialLinks,
        videoIntroUrl: dto.videoIntroUrl ?? existing.videoIntroUrl,
        tagline: dto.tagline ?? existing.tagline,
        updatedAt: new Date(),
      };

      this.profileCustomizations.set(agentId, updated);

      logger.info('Agent profile customization updated', { agentId });
      return updated;
    } catch (error) {
      logger.error('Failed to update agent profile customization', { agentId, error });
      throw error;
    }
  }

  /**
   * Get agent profile customization
   */
  async getProfileCustomization(agentId: string): Promise<AgentProfileCustomization | null> {
    return this.profileCustomizations.get(agentId) || null;
  }

  // ========================================
  // PERFORMANCE THRESHOLDS
  // ========================================

  /**
   * Create agent performance thresholds
   */
  async createPerformanceThresholds(
    agentId: string,
    dto: CreateAgentPerformanceThresholdsDto
  ): Promise<AgentPerformanceThresholds> {
    try {
      const thresholds: AgentPerformanceThresholds = {
        id: `thresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        targets: dto.targets || {},
        alerts: dto.alerts || {},
        updatedAt: new Date(),
      };

      this.performanceThresholds.set(agentId, thresholds);

      logger.info('Agent performance thresholds created', { agentId });
      return thresholds;
    } catch (error) {
      logger.error('Failed to create agent performance thresholds', { agentId, error });
      throw error;
    }
  }

  /**
   * Update agent performance thresholds
   */
  async updatePerformanceThresholds(
    agentId: string,
    dto: UpdateAgentPerformanceThresholdsDto
  ): Promise<AgentPerformanceThresholds> {
    try {
      const existing = this.performanceThresholds.get(agentId);
      if (!existing) {
        throw new Error(`Performance thresholds not found for agent ${agentId}`);
      }

      const updated: AgentPerformanceThresholds = {
        ...existing,
        targets: { ...existing.targets, ...dto.targets },
        alerts: { ...existing.alerts, ...dto.alerts },
        updatedAt: new Date(),
      };

      this.performanceThresholds.set(agentId, updated);

      logger.info('Agent performance thresholds updated', { agentId });
      return updated;
    } catch (error) {
      logger.error('Failed to update agent performance thresholds', { agentId, error });
      throw error;
    }
  }

  /**
   * Get agent performance thresholds
   */
  async getPerformanceThresholds(agentId: string): Promise<AgentPerformanceThresholds | null> {
    return this.performanceThresholds.get(agentId) || null;
  }

  // ========================================
  // CERTIFICATIONS & SKILLS
  // ========================================

  /**
   * Add agent certification
   */
  async addCertification(
    agentId: string,
    dto: CreateAgentCertificationDto
  ): Promise<AgentCertification> {
    try {
      const certification: AgentCertification = {
        id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        name: dto.name,
        issuingOrganization: dto.issuingOrganization,
        certificationNumber: dto.certificationNumber,
        issueDate: dto.issueDate,
        expirationDate: dto.expirationDate,
        status: 'active',
        documentUrl: dto.documentUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existing = this.certifications.get(agentId) || [];
      existing.push(certification);
      this.certifications.set(agentId, existing);

      logger.info('Agent certification added', { agentId, certificationId: certification.id });
      return certification;
    } catch (error) {
      logger.error('Failed to add agent certification', { agentId, error });
      throw error;
    }
  }

  /**
   * Update agent certification
   */
  async updateCertification(
    certificationId: string,
    dto: UpdateAgentCertificationDto
  ): Promise<AgentCertification> {
    try {
      for (const [agentId, certs] of this.certifications.entries()) {
        const index = certs.findIndex((c) => c.id === certificationId);
        if (index !== -1) {
          const updated = {
            ...certs[index],
            ...dto,
            updatedAt: new Date(),
          };
          certs[index] = updated;
          this.certifications.set(agentId, certs);

          logger.info('Agent certification updated', { certificationId });
          return updated;
        }
      }
      throw new Error(`Certification not found: ${certificationId}`);
    } catch (error) {
      logger.error('Failed to update agent certification', { certificationId, error });
      throw error;
    }
  }

  /**
   * Get agent certifications
   */
  async getCertifications(agentId: string): Promise<AgentCertification[]> {
    return this.certifications.get(agentId) || [];
  }

  /**
   * Add agent skill
   */
  async addSkill(agentId: string, dto: CreateAgentSkillDto): Promise<AgentSkill> {
    try {
      const skill: AgentSkill = {
        id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        skillName: dto.skillName,
        category: dto.category,
        proficiencyLevel: dto.proficiencyLevel,
        yearsOfExperience: dto.yearsOfExperience,
        endorsements: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existing = this.skills.get(agentId) || [];
      existing.push(skill);
      this.skills.set(agentId, existing);

      logger.info('Agent skill added', { agentId, skillId: skill.id });
      return skill;
    } catch (error) {
      logger.error('Failed to add agent skill', { agentId, error });
      throw error;
    }
  }

  /**
   * Update agent skill
   */
  async updateSkill(skillId: string, dto: UpdateAgentSkillDto): Promise<AgentSkill> {
    try {
      for (const [agentId, skills] of this.skills.entries()) {
        const index = skills.findIndex((s) => s.id === skillId);
        if (index !== -1) {
          const updated = {
            ...skills[index],
            ...dto,
            updatedAt: new Date(),
          };
          skills[index] = updated;
          this.skills.set(agentId, skills);

          logger.info('Agent skill updated', { skillId });
          return updated;
        }
      }
      throw new Error(`Skill not found: ${skillId}`);
    } catch (error) {
      logger.error('Failed to update agent skill', { skillId, error });
      throw error;
    }
  }

  /**
   * Get agent skills
   */
  async getSkills(agentId: string): Promise<AgentSkill[]> {
    return this.skills.get(agentId) || [];
  }

  // ========================================
  // COMPLETE CONFIGURATION
  // ========================================

  /**
   * Get complete agent configuration
   */
  async getCompleteConfiguration(agentId: string): Promise<AgentConfiguration | null> {
    try {
      const availability = await this.getAvailability(agentId);
      const leadPreferences = await this.getLeadPreferences(agentId);
      const notificationPreferences = await this.getNotificationPreferences(agentId);
      const profileCustomization = await this.getProfileCustomization(agentId);
      const performanceThresholds = await this.getPerformanceThresholds(agentId);

      if (
        !availability ||
        !leadPreferences ||
        !notificationPreferences ||
        !profileCustomization ||
        !performanceThresholds
      ) {
        return null;
      }

      const configuration: AgentConfiguration = {
        agentId,
        availability,
        leadPreferences,
        notificationPreferences,
        profileCustomization,
        performanceThresholds,
        updatedAt: new Date(),
      };

      return configuration;
    } catch (error) {
      logger.error('Failed to get complete agent configuration', { agentId, error });
      return null;
    }
  }

  /**
   * Initialize default configuration for new agent
   */
  async initializeDefaultConfiguration(agentId: string): Promise<AgentConfiguration> {
    try {
      // Create default availability (9-5 weekdays)
      const availability = await this.createAvailability(agentId, {
        workHours: [
          { dayOfWeek: 'monday', startTime: '09:00', endTime: '17:00', isEnabled: true },
          { dayOfWeek: 'tuesday', startTime: '09:00', endTime: '17:00', isEnabled: true },
          { dayOfWeek: 'wednesday', startTime: '09:00', endTime: '17:00', isEnabled: true },
          { dayOfWeek: 'thursday', startTime: '09:00', endTime: '17:00', isEnabled: true },
          { dayOfWeek: 'friday', startTime: '09:00', endTime: '17:00', isEnabled: true },
          { dayOfWeek: 'saturday', startTime: '09:00', endTime: '17:00', isEnabled: false },
          { dayOfWeek: 'sunday', startTime: '09:00', endTime: '17:00', isEnabled: false },
        ],
        autoAcceptLeads: false,
        maxConcurrentLeads: 10,
      });

      // Create default lead preferences
      const leadPreferences = await this.createLeadPreferences(agentId, {
        insuranceTypes: {
          auto: 'neutral',
          home: 'neutral',
          life: 'neutral',
          health: 'neutral',
          commercial: 'neutral',
        },
        minLeadQualityScore: 50,
      });

      // Create default notification preferences
      const notificationPreferences = await this.createNotificationPreferences(agentId, {
        channels: {
          email: true,
          sms: false,
          push: true,
          in_app: true,
        },
        leadAssignment: {
          enabled: true,
          channels: ['email', 'push'],
        },
      });

      // Create default profile customization
      const profileCustomization = await this.createProfileCustomization(agentId, {});

      // Create default performance thresholds
      const performanceThresholds = await this.createPerformanceThresholds(agentId, {
        targets: {
          monthlyLeadGoal: 50,
          targetConversionRate: 25,
          targetResponseTime: 30,
        },
        alerts: {
          lowConversionRate: { enabled: true, threshold: 15 },
          slowResponseTime: { enabled: true, threshold: 60 },
          capacityWarning: { enabled: true, threshold: 80 },
        },
      });

      logger.info('Default agent configuration initialized', { agentId });

      return {
        agentId,
        availability,
        leadPreferences,
        notificationPreferences,
        profileCustomization,
        performanceThresholds,
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to initialize default agent configuration', { agentId, error });
      throw error;
    }
  }
}
