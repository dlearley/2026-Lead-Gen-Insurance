/**
 * Threat Score Card Component
 * Visualizes competitor threat score with detailed breakdown
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Shield as ShieldIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface ThreatScoreBreakdown {
  recentActivity: number;
  marketMovement: number;
  winLossTrend: number;
  fundingResources: number;
}

interface ThreatScoreCardProps {
  competitorName: string;
  score: number;
  breakdown: ThreatScoreBreakdown;
  trend?: 'increasing' | 'decreasing' | 'stable';
  showDetails?: boolean;
}

const getThreatLevel = (score: number): { level: string; color: string; icon: React.ReactNode } => {
  if (score >= 80) {
    return {
      level: 'Critical',
      color: '#ef4444',
      icon: <WarningIcon />,
    };
  } else if (score >= 60) {
    return {
      level: 'High',
      color: '#f97316',
      icon: <TrendingUpIcon />,
    };
  } else if (score >= 40) {
    return {
      level: 'Medium',
      color: '#eab308',
      icon: <InfoIcon />,
    };
  } else {
    return {
      level: 'Low',
      color: '#22c55e',
      icon: <ShieldIcon />,
    };
  }
};

export const ThreatScoreCard: React.FC<ThreatScoreCardProps> = ({
  competitorName,
  score,
  breakdown,
  trend = 'stable',
  showDetails = true,
}) => {
  const { level, color, icon } = getThreatLevel(score);

  const getProgressBarColor = (value: number) => {
    if (value >= 70) return '#ef4444';
    if (value >= 40) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <Card>
      <CardHeader
        title="Threat Score"
        subheader={competitorName}
        avatar={
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: '50%',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            {icon}
          </Box>
        }
        action={
          <Chip
            label={level}
            sx={{
              backgroundColor: color,
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        }
      />
      <CardContent>
        {/* Main Score */}
        <Box textAlign="center" mb={3}>
          <Typography variant="h2" sx={{ color, fontWeight: 'bold' }}>
            {Math.round(score)}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            out of 100
          </Typography>
          {trend !== 'stable' && (
            <Chip
              label={trend === 'increasing' ? '↑ Increasing' : '↓ Decreasing'}
              size="small"
              color={trend === 'increasing' ? 'error' : 'success'}
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        {/* Score Breakdown */}
        {showDetails && (
          <Grid container spacing={2}>
            {[
              { label: 'Recent Activity', value: breakdown.recentActivity, weight: 0.3 },
              { label: 'Market Movement', value: breakdown.marketMovement, weight: 0.3 },
              { label: 'Win/Loss Trend', value: breakdown.winLossTrend, weight: 0.2 },
              { label: 'Funding/Resources', value: breakdown.fundingResources, weight: 0.2 },
            ].map((item) => (
              <Grid item xs={12} key={item.label}>
                <Box mb={1}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">{item.label}</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {Math.round(item.value)} ({Math.round(item.weight * 100)}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.value}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#e5e7eb',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getProgressBarColor(item.value),
                      },
                    }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Recommendations */}
        {score >= 60 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Action Required:</strong> This competitor poses a significant threat.
              Consider reviewing competitive positioning and developing counter-strategies.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
