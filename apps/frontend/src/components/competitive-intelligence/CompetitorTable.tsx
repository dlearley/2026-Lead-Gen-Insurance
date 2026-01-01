/**
 * Competitor Table Component
 * Displays a table of competitors with key metrics and actions
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  TrendingUp,
  TrendingDown,
  MoreVert,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface Competitor {
  id: string;
  name: string;
  website?: string;
  tier: string;
  category: string;
  threatScore: number;
  opportunityScore: number;
  marketShare?: number;
  lastWebsiteScan?: Date;
  lastNewsScan?: Date;
  isActive: boolean;
}

interface CompetitorTableProps {
  competitors: Competitor[];
  onView: (competitor: Competitor) => void;
  onEdit: (competitor: Competitor) => void;
  onDelete: (competitorId: string) => void;
  loading?: boolean;
}

const tierColors: Record<string, string> = {
  PRIMARY: 'error',
  SECONDARY: 'warning',
  EMERGING: 'info',
  ADJACENT: 'default',
};

const categoryColors: Record<string, string> = {
  DIRECT: 'error',
  INDIRECT: 'warning',
  ALTERNATIVE: 'info',
};

export const CompetitorTable: React.FC<CompetitorTableProps> = ({
  competitors,
  onView,
  onEdit,
  onDelete,
  loading = false,
}) => {
  const getThreatColor = (score: number) => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#22c55e';
  };

  const getOpportunityColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Competitor</TableCell>
            <TableCell>Tier</TableCell>
            <TableCell>Category</TableCell>
            <TableCell align="center">Threat Score</TableCell>
            <TableCell align="center">Opportunity Score</TableCell>
            <TableCell>Market Share</TableCell>
            <TableCell>Last Scan</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} sx={{ py: 3 }}>
                <LinearProgress />
              </TableCell>
            </TableRow>
          ) : competitors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center">
                <Typography variant="body2" color="textSecondary">
                  No competitors found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            competitors.map((competitor) => (
              <TableRow key={competitor.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {competitor.name}
                    </Typography>
                    {competitor.website && (
                      <Typography variant="caption" color="textSecondary">
                        {competitor.website}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={competitor.tier} color={tierColors[competitor.tier] as any} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={competitor.category} color={categoryColors[competitor.category] as any} size="small" />
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      sx={{ color: getThreatColor(competitor.threatScore) }}
                    >
                      {competitor.threatScore}
                    </Typography>
                    <TrendingUp fontSize="small" sx={{ color: getThreatColor(competitor.threatScore) }} />
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      sx={{ color: getOpportunityColor(competitor.opportunityScore) }}
                    >
                      {competitor.opportunityScore}
                    </Typography>
                    <TrendingDown fontSize="small" sx={{ color: getOpportunityColor(competitor.opportunityScore) }} />
                  </Box>
                </TableCell>
                <TableCell>
                  {competitor.marketShare !== undefined ? (
                    <Typography variant="body2">{competitor.marketShare.toFixed(1)}%</Typography>
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      N/A
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {competitor.lastWebsiteScan ? (
                    <Typography variant="caption" color="textSecondary">
                      {formatDistanceToNow(new Date(competitor.lastWebsiteScan))} ago
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      Never
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={competitor.isActive ? 'Active' : 'Inactive'}
                    color={competitor.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" justifyContent="flex-end" gap={0.5}>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => onView(competitor)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(competitor)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onDelete(competitor.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
