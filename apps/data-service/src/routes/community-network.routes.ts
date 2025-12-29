import { Router, Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { connectionService } from '../services/connection.service.js';
import { mentorshipService } from '../services/mentorship.service.js';
import { groupService } from '../services/group.service.js';
import { referralNetworkService } from '../services/referral-network.service.js';
import { ConnectionStatus, MentorStatus, MentorshipRequestStatus, SessionStatus, GroupType, GroupMemberRole, MembershipStatus, ReferralStatus } from '@prisma/client';

export function createCommunityNetworkRoutes(): Router {
  const router = Router();

  // ========================================
  // CONNECTION & FOLLOWING ROUTES
  // ========================================

  router.post('/connections', async (req: Request, res: Response) => {
    try {
      const { requesterId, addresseeId } = req.body;
      if (!requesterId || !addresseeId) {
        return res.status(400).json({ error: 'requesterId and addresseeId are required' });
      }
      const connection = await connectionService.createConnection(requesterId, addresseeId);
      res.status(201).json(connection);
    } catch (error: any) {
      logger.error('Failed to create connection', { error });
      res.status(400).json({ error: error.message || 'Failed to create connection' });
    }
  });

  router.get('/connections/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { status } = req.query;
      const connections = await connectionService.getConnectionsByAgent(
        agentId,
        status as ConnectionStatus | undefined
      );
      res.json(connections);
    } catch (error) {
      logger.error('Failed to get connections', { error });
      res.status(500).json({ error: 'Failed to get connections' });
    }
  });

  router.patch('/connections/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }
      const connection = await connectionService.updateConnectionStatus(id, status);
      res.json(connection);
    } catch (error) {
      logger.error('Failed to update connection', { error });
      res.status(500).json({ error: 'Failed to update connection' });
    }
  });

  router.delete('/connections/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await connectionService.deleteConnection(id);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete connection', { error });
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  });

  router.post('/follows', async (req: Request, res: Response) => {
    try {
      const { followerId, followingId } = req.body;
      if (!followerId || !followingId) {
        return res.status(400).json({ error: 'followerId and followingId are required' });
      }
      const follow = await connectionService.followAgent(followerId, followingId);
      res.status(201).json(follow);
    } catch (error: any) {
      logger.error('Failed to follow agent', { error });
      res.status(400).json({ error: error.message || 'Failed to follow agent' });
    }
  });

  router.delete('/follows', async (req: Request, res: Response) => {
    try {
      const { followerId, followingId } = req.body;
      if (!followerId || !followingId) {
        return res.status(400).json({ error: 'followerId and followingId are required' });
      }
      await connectionService.unfollowAgent(followerId, followingId);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to unfollow agent', { error });
      res.status(500).json({ error: 'Failed to unfollow agent' });
    }
  });

  router.get('/followers/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const followers = await connectionService.getFollowers(agentId);
      res.json(followers);
    } catch (error) {
      logger.error('Failed to get followers', { error });
      res.status(500).json({ error: 'Failed to get followers' });
    }
  });

  router.get('/following/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const following = await connectionService.getFollowing(agentId);
      res.json(following);
    } catch (error) {
      logger.error('Failed to get following', { error });
      res.status(500).json({ error: 'Failed to get following' });
    }
  });

  router.get('/connection-stats/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const stats = await connectionService.getConnectionStats(agentId);
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get connection stats', { error });
      res.status(500).json({ error: 'Failed to get connection stats' });
    }
  });

  router.get('/suggested-connections/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { limit } = req.query;
      const suggestions = await connectionService.getSuggestedConnections(
        agentId,
        limit ? parseInt(limit as string) : 10
      );
      res.json(suggestions);
    } catch (error) {
      logger.error('Failed to get suggested connections', { error });
      res.status(500).json({ error: 'Failed to get suggested connections' });
    }
  });

  // ========================================
  // MENTORSHIP ROUTES
  // ========================================

  router.post('/mentors', async (req: Request, res: Response) => {
    try {
      const { agentId, specialties, bio, yearsOfExperience, maxMentees } = req.body;
      if (!agentId || !specialties || !bio || yearsOfExperience === undefined) {
        return res.status(400).json({ error: 'agentId, specialties, bio, and yearsOfExperience are required' });
      }
      const mentor = await mentorshipService.createMentor(agentId, {
        specialties,
        bio,
        yearsOfExperience,
        maxMentees,
      });
      res.status(201).json(mentor);
    } catch (error: any) {
      logger.error('Failed to create mentor', { error });
      res.status(400).json({ error: error.message || 'Failed to create mentor' });
    }
  });

  router.get('/mentors', async (req: Request, res: Response) => {
    try {
      const { status, specialty, minRating } = req.query;
      const mentors = await mentorshipService.listMentors({
        status: status as MentorStatus | undefined,
        specialty: specialty as string | undefined,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
      });
      res.json(mentors);
    } catch (error) {
      logger.error('Failed to list mentors', { error });
      res.status(500).json({ error: 'Failed to list mentors' });
    }
  });

  router.get('/mentors/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const mentor = await mentorshipService.getMentor(id);
      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
      }
      res.json(mentor);
    } catch (error) {
      logger.error('Failed to get mentor', { error });
      res.status(500).json({ error: 'Failed to get mentor' });
    }
  });

  router.get('/mentors/by-agent/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const mentor = await mentorshipService.getMentorByAgentId(agentId);
      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
      }
      res.json(mentor);
    } catch (error) {
      logger.error('Failed to get mentor by agent ID', { error });
      res.status(500).json({ error: 'Failed to get mentor' });
    }
  });

  router.patch('/mentors/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const mentor = await mentorshipService.updateMentor(id, req.body);
      res.json(mentor);
    } catch (error) {
      logger.error('Failed to update mentor', { error });
      res.status(500).json({ error: 'Failed to update mentor' });
    }
  });

  router.post('/mentorship-requests', async (req: Request, res: Response) => {
    try {
      const { mentorId, menteeId, message } = req.body;
      if (!mentorId || !menteeId || !message) {
        return res.status(400).json({ error: 'mentorId, menteeId, and message are required' });
      }
      const request = await mentorshipService.createMentorshipRequest(mentorId, menteeId, message);
      res.status(201).json(request);
    } catch (error: any) {
      logger.error('Failed to create mentorship request', { error });
      res.status(400).json({ error: error.message || 'Failed to create mentorship request' });
    }
  });

  router.patch('/mentorship-requests/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }
      const request = await mentorshipService.updateMentorshipRequest(id, status);
      res.json(request);
    } catch (error: any) {
      logger.error('Failed to update mentorship request', { error });
      res.status(400).json({ error: error.message || 'Failed to update mentorship request' });
    }
  });

  router.get('/mentorship-requests/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const request = await mentorshipService.getMentorshipRequest(id);
      if (!request) {
        return res.status(404).json({ error: 'Mentorship request not found' });
      }
      res.json(request);
    } catch (error) {
      logger.error('Failed to get mentorship request', { error });
      res.status(500).json({ error: 'Failed to get mentorship request' });
    }
  });

  router.get('/mentorship-requests/by-mentor/:mentorId', async (req: Request, res: Response) => {
    try {
      const { mentorId } = req.params;
      const { status } = req.query;
      const requests = await mentorshipService.getMentorshipsByMentor(
        mentorId,
        status as MentorshipRequestStatus | undefined
      );
      res.json(requests);
    } catch (error) {
      logger.error('Failed to get mentorships by mentor', { error });
      res.status(500).json({ error: 'Failed to get mentorships' });
    }
  });

  router.get('/mentorship-requests/by-mentee/:menteeId', async (req: Request, res: Response) => {
    try {
      const { menteeId } = req.params;
      const { status } = req.query;
      const requests = await mentorshipService.getMentorshipsByMentee(
        menteeId,
        status as MentorshipRequestStatus | undefined
      );
      res.json(requests);
    } catch (error) {
      logger.error('Failed to get mentorships by mentee', { error });
      res.status(500).json({ error: 'Failed to get mentorships' });
    }
  });

  router.post('/mentorship-sessions', async (req: Request, res: Response) => {
    try {
      const { mentorshipRequestId, scheduledAt, durationMinutes } = req.body;
      if (!mentorshipRequestId || !scheduledAt || !durationMinutes) {
        return res.status(400).json({ error: 'mentorshipRequestId, scheduledAt, and durationMinutes are required' });
      }
      const session = await mentorshipService.createSession({
        mentorshipRequestId,
        scheduledAt: new Date(scheduledAt),
        durationMinutes,
      });
      res.status(201).json(session);
    } catch (error: any) {
      logger.error('Failed to create mentorship session', { error });
      res.status(400).json({ error: error.message || 'Failed to create session' });
    }
  });

  router.patch('/mentorship-sessions/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const session = await mentorshipService.updateSession(id, req.body);
      res.json(session);
    } catch (error: any) {
      logger.error('Failed to update mentorship session', { error });
      res.status(400).json({ error: error.message || 'Failed to update session' });
    }
  });

  router.get('/mentorship-sessions/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const session = await mentorshipService.getSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(session);
    } catch (error) {
      logger.error('Failed to get mentorship session', { error });
      res.status(500).json({ error: 'Failed to get session' });
    }
  });

  router.get('/mentorship-sessions/by-request/:mentorshipRequestId', async (req: Request, res: Response) => {
    try {
      const { mentorshipRequestId } = req.params;
      const sessions = await mentorshipService.getSessionsByRequest(mentorshipRequestId);
      res.json(sessions);
    } catch (error) {
      logger.error('Failed to get sessions by request', { error });
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  });

  // ========================================
  // GROUP ROUTES
  // ========================================

  router.post('/groups', async (req: Request, res: Response) => {
    try {
      const { createdBy, name, description, type, category, region, specialty, coverImage } = req.body;
      if (!createdBy || !name || !description || !type) {
        return res.status(400).json({ error: 'createdBy, name, description, and type are required' });
      }
      const group = await groupService.createGroup(createdBy, {
        name,
        description,
        type,
        category,
        region,
        specialty,
        coverImage,
      });
      res.status(201).json(group);
    } catch (error) {
      logger.error('Failed to create group', { error });
      res.status(500).json({ error: 'Failed to create group' });
    }
  });

  router.get('/groups', async (req: Request, res: Response) => {
    try {
      const { type, category, region, specialty } = req.query;
      const groups = await groupService.listGroups({
        type: type as GroupType | undefined,
        category: category as string | undefined,
        region: region as string | undefined,
        specialty: specialty as string | undefined,
      });
      res.json(groups);
    } catch (error) {
      logger.error('Failed to list groups', { error });
      res.status(500).json({ error: 'Failed to list groups' });
    }
  });

  router.get('/groups/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const group = await groupService.getGroup(id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      res.json(group);
    } catch (error) {
      logger.error('Failed to get group', { error });
      res.status(500).json({ error: 'Failed to get group' });
    }
  });

  router.patch('/groups/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const group = await groupService.updateGroup(id, req.body);
      res.json(group);
    } catch (error) {
      logger.error('Failed to update group', { error });
      res.status(500).json({ error: 'Failed to update group' });
    }
  });

  router.delete('/groups/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await groupService.deleteGroup(id);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete group', { error });
      res.status(500).json({ error: 'Failed to delete group' });
    }
  });

  router.post('/groups/:id/join', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }
      const membership = await groupService.joinGroup(id, agentId);
      res.status(201).json(membership);
    } catch (error: any) {
      logger.error('Failed to join group', { error });
      res.status(400).json({ error: error.message || 'Failed to join group' });
    }
  });

  router.post('/groups/:id/leave', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }
      await groupService.leaveGroup(id, agentId);
      res.status(204).send();
    } catch (error: any) {
      logger.error('Failed to leave group', { error });
      res.status(400).json({ error: error.message || 'Failed to leave group' });
    }
  });

  router.get('/groups/:id/members', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.query;
      const members = await groupService.getGroupMembers(
        id,
        status as MembershipStatus | undefined
      );
      res.json(members);
    } catch (error) {
      logger.error('Failed to get group members', { error });
      res.status(500).json({ error: 'Failed to get group members' });
    }
  });

  router.patch('/group-memberships/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const membership = await groupService.updateMembership(id, req.body);
      res.json(membership);
    } catch (error: any) {
      logger.error('Failed to update membership', { error });
      res.status(400).json({ error: error.message || 'Failed to update membership' });
    }
  });

  router.get('/agent-groups/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { status } = req.query;
      const groups = await groupService.getAgentGroups(
        agentId,
        status as MembershipStatus | undefined
      );
      res.json(groups);
    } catch (error) {
      logger.error('Failed to get agent groups', { error });
      res.status(500).json({ error: 'Failed to get agent groups' });
    }
  });

  // ========================================
  // REFERRAL NETWORK ROUTES
  // ========================================

  router.post('/referrals', async (req: Request, res: Response) => {
    try {
      const { referrerId, refereeId, leadId, reason, commissionPercentage } = req.body;
      if (!referrerId || !refereeId || !leadId || !reason) {
        return res.status(400).json({ error: 'referrerId, refereeId, leadId, and reason are required' });
      }
      const referral = await referralNetworkService.createReferral(referrerId, {
        refereeId,
        leadId,
        reason,
        commissionPercentage,
      });
      res.status(201).json(referral);
    } catch (error: any) {
      logger.error('Failed to create referral', { error });
      res.status(400).json({ error: error.message || 'Failed to create referral' });
    }
  });

  router.get('/referrals/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const referral = await referralNetworkService.getReferral(id);
      if (!referral) {
        return res.status(404).json({ error: 'Referral not found' });
      }
      res.json(referral);
    } catch (error) {
      logger.error('Failed to get referral', { error });
      res.status(500).json({ error: 'Failed to get referral' });
    }
  });

  router.patch('/referrals/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const referral = await referralNetworkService.updateReferral(id, req.body);
      res.json(referral);
    } catch (error) {
      logger.error('Failed to update referral', { error });
      res.status(500).json({ error: 'Failed to update referral' });
    }
  });

  router.get('/referrals/by-agent/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { type } = req.query;
      const referrals = await referralNetworkService.getReferralsByAgent(
        agentId,
        (type as 'sent' | 'received' | 'all') || 'all'
      );
      res.json(referrals);
    } catch (error) {
      logger.error('Failed to get referrals by agent', { error });
      res.status(500).json({ error: 'Failed to get referrals' });
    }
  });

  router.get('/referral-stats/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const stats = await referralNetworkService.getReferralStats(agentId);
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get referral stats', { error });
      res.status(500).json({ error: 'Failed to get referral stats' });
    }
  });

  router.post('/referrals/:id/mark-paid', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { commissionAmount } = req.body;
      if (!commissionAmount) {
        return res.status(400).json({ error: 'commissionAmount is required' });
      }
      const referral = await referralNetworkService.markCommissionPaid(id, commissionAmount);
      res.json(referral);
    } catch (error) {
      logger.error('Failed to mark commission paid', { error });
      res.status(500).json({ error: 'Failed to mark commission paid' });
    }
  });

  return router;
}
