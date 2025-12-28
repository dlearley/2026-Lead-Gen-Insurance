import { Router } from 'express';
import { brokerNetworkRepository } from '../services/broker-network-repository';
import { networkEffectsCalculator } from '../services/network-effects-calculator';
import type {
  BrokerConnectionRequest,
  CreateBrokerReferralDto,
  UpdateBrokerConnectionDto,
  NetworkAnalyticsParams,
} from '@insurance/types';

const router = Router();

/**
 * GET /api/broker-network/profile/:brokerId
 * Get broker network profile
 */
router.get('/profile/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const profile = await brokerNetworkRepository.getOrCreateBrokerProfile(brokerId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching broker profile:', error);
    res.status(500).json({ error: 'Failed to fetch broker profile' });
  }
});

/**
 * GET /api/broker-network/connections/:brokerId
 * Get broker connections
 */
router.get('/connections/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const { isActive, relationshipType } = req.query;

    const connections = await brokerNetworkRepository.getConnections(
      brokerId,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      relationshipType as string
    );

    res.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

/**
 * POST /api/broker-network/connections
 * Create a new broker connection
 */
router.post('/connections', async (req, res) => {
  try {
    const data: BrokerConnectionRequest = req.body;

    // Validate required fields
    if (!data.brokerId || !data.connectedBrokerId) {
      return res.status(400).json({ error: 'brokerId and connectedBrokerId are required' });
    }

    if (data.brokerId === data.connectedBrokerId) {
      return res.status(400).json({ error: 'Cannot connect to yourself' });
    }

    if (!data.relationshipType) {
      return res.status(400).json({ error: 'relationshipType is required' });
    }

    const connection = await brokerNetworkRepository.createConnection(data);

    res.status(201).json(connection);
  } catch (error: any) {
    console.error('Error creating connection:', error);

    // Handle duplicate connection error
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Connection already exists' });
    }

    res.status(500).json({ error: 'Failed to create connection' });
  }
});

/**
 * PATCH /api/broker-network/connections/:id
 * Update broker connection
 */
router.patch('/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateBrokerConnectionDto = req.body;

    const connection = await brokerNetworkRepository.updateConnection(id, data);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    res.json(connection);
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

/**
 * GET /api/broker-network/referrals/:brokerId
 * Get referrals for a broker (sent and received)
 */
router.get('/referrals/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const { type = 'all' } = req.query;

    // For now, return empty array - would query from repository in production
    res.json({
      sent: [],
      received: [],
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

/**
 * POST /api/broker-network/referrals
 * Create a new referral
 */
router.post('/referrals', async (req, res) => {
  try {
    const { referringBrokerId, ...data }: CreateBrokerReferralDto & { referringBrokerId: string } = req.body;

    // Validate required fields
    if (!referringBrokerId || !data.leadId || !data.receivingBrokerId) {
      return res.status(400).json({
        error: 'referringBrokerId, leadId, and receivingBrokerId are required',
      });
    }

    if (referringBrokerId === data.receivingBrokerId) {
      return res.status(400).json({ error: 'Cannot refer to yourself' });
    }

    const referral = await brokerNetworkRepository.createReferral(data, referringBrokerId);

    res.status(201).json(referral);
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

/**
 * PATCH /api/broker-network/referrals/:id/status
 * Update referral status
 */
router.patch('/referrals/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, commissionAmount } = req.body;

    if (!status || !['accepted', 'converted', 'declined', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const referral = await brokerNetworkRepository.updateReferralStatus(
      id,
      status,
      commissionAmount
    );

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    res.json(referral);
  } catch (error) {
    console.error('Error updating referral status:', error);
    res.status(500).json({ error: 'Failed to update referral status' });
  }
});

/**
 * GET /api/broker-network/metrics/:brokerId
 * Get network metrics for a broker
 */
router.get('/metrics/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const metrics = await brokerNetworkRepository.getNetworkMetrics(brokerId, start, end);

    if (!metrics) {
      return res.status(404).json({ error: 'Metrics not found' });
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/broker-network/value/:brokerId
 * Calculate network value for a broker
 */
router.get('/value/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const value = await brokerNetworkRepository.calculateNetworkValue(brokerId);

    res.json(value);
  } catch (error) {
    console.error('Error calculating network value:', error);
    res.status(500).json({ error: 'Failed to calculate network value' });
  }
});

/**
 * GET /api/broker-network/multiplier/:brokerId
 * Get referral multiplier for a broker
 */
router.get('/multiplier/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const multiplier = await networkEffectsCalculator.calculateReferralMultiplier(brokerId);

    res.json({ multiplier });
  } catch (error) {
    console.error('Error calculating referral multiplier:', error);
    res.status(500).json({ error: 'Failed to calculate referral multiplier' });
  }
});

/**
 * GET /api/broker-network/score/:brokerId
 * Calculate network score for a broker
 */
router.get('/score/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const score = await networkEffectsCalculator.calculateNetworkScore(brokerId);

    res.json({ score });
  } catch (error) {
    console.error('Error calculating network score:', error);
    res.status(500).json({ error: 'Failed to calculate network score' });
  }
});

/**
 * GET /api/broker-network/reach/:brokerId
 * Calculate network reach for a broker
 */
router.get('/reach/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const { maxDepth = 3 } = req.query;

    const reach = await networkEffectsCalculator.calculateNetworkReach(
      brokerId,
      parseInt(maxDepth as string)
    );

    res.json({ reach, maxDepth: parseInt(maxDepth as string) });
  } catch (error) {
    console.error('Error calculating network reach:', error);
    res.status(500).json({ error: 'Failed to calculate network reach' });
  }
});

/**
 * GET /api/broker-network/growth/:brokerId
 * Get growth metrics for a broker
 */
router.get('/growth/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const { period = 'month' } = req.query;

    if (!['week', 'month', 'quarter'].includes(period as string)) {
      return res.status(400).json({ error: 'Invalid period. Must be week, month, or quarter' });
    }

    const growth = await networkEffectsCalculator.calculateGrowthMetrics(
      brokerId,
      period as 'week' | 'month' | 'quarter'
    );

    res.json(growth);
  } catch (error) {
    console.error('Error calculating growth metrics:', error);
    res.status(500).json({ error: 'Failed to calculate growth metrics' });
  }
});

/**
 * GET /api/broker-network/leaderboard
 * Get network leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const leaderboard = await networkEffectsCalculator.generateLeaderboard(
      parseInt(limit as string)
    );

    res.json(leaderboard);
  } catch (error) {
    console.error('Error generating leaderboard:', error);
    res.status(500).json({ error: 'Failed to generate leaderboard' });
  }
});

/**
 * GET /api/broker-network/effectiveness/:brokerId
 * Analyze network effectiveness
 */
router.get('/effectiveness/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const effectiveness = await networkEffectsCalculator.analyzeNetworkEffectiveness(brokerId);

    res.json(effectiveness);
  } catch (error: any) {
    console.error('Error analyzing network effectiveness:', error);
    
    if (error.message === 'Profile not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to analyze network effectiveness' });
  }
});

/**
 * GET /api/broker-network/prediction/:brokerId
 * Predict network growth
 */
router.get('/prediction/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const { months = 6 } = req.query;

    const monthsValue = parseInt(months as string);
    if (monthsValue < 1 || monthsValue > 24) {
      return res.status(400).json({ error: 'Months must be between 1 and 24' });
    }

    const prediction = await networkEffectsCalculator.predictNetworkGrowth(
      brokerId,
      monthsValue
    );

    res.json(prediction);
  } catch (error: any) {
    console.error('Error predicting network growth:', error);

    if (error.message === 'Profile not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to predict network growth' });
  }
});

/**
 * POST /api/broker-network/recalculate-scores
 * Recalculate network scores for all brokers (admin endpoint)
 */
router.post('/recalculate-scores', async (req, res) => {
  try {
    await brokerNetworkRepository.recalculateNetworkScores();

    res.json({ message: 'Network scores recalculated successfully' });
  } catch (error) {
    console.error('Error recalculating scores:', error);
    res.status(500).json({ error: 'Failed to recalculate network scores' });
  }
});

export default router;
