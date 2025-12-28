import { vipRepository } from '../repositories/vip.repository.js';
import { logger } from '@insurance-lead-gen/core';

export enum EngagementAction {
  LEAD_ACCEPTED = 'LEAD_ACCEPTED',
  LEAD_CONVERTED = 'LEAD_CONVERTED',
  COMMUNITY_POST = 'COMMUNITY_POST',
  COMMUNITY_COMMENT = 'COMMUNITY_COMMENT',
  LIKE_RECEIVED = 'LIKE_RECEIVED',
}

const ACTION_POINTS: Record<EngagementAction, number> = {
  [EngagementAction.LEAD_ACCEPTED]: 10,
  [EngagementAction.LEAD_CONVERTED]: 100,
  [EngagementAction.COMMUNITY_POST]: 5,
  [EngagementAction.COMMUNITY_COMMENT]: 2,
  [EngagementAction.LIKE_RECEIVED]: 1,
};

export class VIPService {
  async rewardEngagement(agentId: string, action: EngagementAction) {
    const points = ACTION_POINTS[action];
    try {
      const status = await vipRepository.updateAgentPoints(agentId, points);
      logger.info('Agent rewarded for engagement', { agentId, action, points, newTotal: status.points });
      return status;
    } catch (error) {
      logger.error('Failed to reward agent engagement', { error, agentId, action });
      throw error;
    }
  }

  async processLeadConversion(agentId: string) {
    return this.rewardEngagement(agentId, EngagementAction.LEAD_CONVERTED);
  }

  async processLeadAcceptance(agentId: string) {
    return this.rewardEngagement(agentId, EngagementAction.LEAD_ACCEPTED);
  }
}

export const vipService = new VIPService();
