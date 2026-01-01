/**
 * Alerts Feed Component
 * Displays competitive intelligence alerts with filtering and actions
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  CheckCircle,
  MoreVert,
  Error,
  Warning,
  Info,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  competitorId?: string;
  competitorName?: string;
  alertType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description?: string;
  recommendation?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

interface AlertsFeedProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string, note?: string) => void;
  onDismiss: (alertId: string) => void;
  onViewDetails: (alert: Alert) => void;
  loading?: boolean;
}

const severityConfig = {
  CRITICAL: { color: 'error', icon: <Error />, priority: 4 },
  HIGH: { color: 'error' as const, icon: <Warning />, priority: 3 },
  MEDIUM: { color: 'warning' as const, icon: <Info />, priority: 2 },
  LOW: { color: 'info' as const, icon: <Info />, priority: 1 },
};

const statusConfig = {
  ACTIVE: { label: 'Active', color: 'error' as const },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'warning' as const },
  IN_PROGRESS: { label: 'In Progress', color: 'info' as const },
  RESOLVED: { label: 'Resolved', color: 'success' as const },
  DISMISSED: { label: 'Dismissed', color: 'default' as const },
};

export const AlertsFeed: React.FC<AlertsFeedProps> = ({
  alerts,
  onAcknowledge,
  onDismiss,
  onViewDetails,
  loading = false,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const filteredAlerts = alerts
    .filter((alert) => filterSeverity === 'ALL' || alert.severity === filterSeverity)
    .filter((alert) => filterStatus === 'ALL' || alert.status === filterStatus)
    .sort((a, b) => {
      const severityA = severityConfig[a.severity].priority;
      const severityB = severityConfig[b.severity].priority;
      return severityB - severityA || b.createdAt.getTime() - a.createdAt.getTime();
    });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, alert: Alert) => {
    setAnchorEl(event.currentTarget);
    setSelectedAlert(alert);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAlert(null);
  };

  const handleAcknowledge = () => {
    if (selectedAlert) {
      onAcknowledge(selectedAlert.id);
      handleMenuClose();
    }
  };

  const handleDismiss = () => {
    if (selectedAlert) {
      onDismiss(selectedAlert.id);
      handleMenuClose();
    }
  };

  const activeAlertsCount = alerts.filter((a) => a.status === 'ACTIVE').length;
  const criticalAlertsCount = alerts.filter(
    (a) => a.status === 'ACTIVE' && a.severity === 'CRITICAL'
  ).length;

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <NotificationsActive />
            <Typography variant="h6">Competitive Alerts</Typography>
            <Chip
              label={activeAlertsCount}
              color={activeAlertsCount > 0 ? 'error' : 'default'}
              size="small"
            />
            {criticalAlertsCount > 0 && (
              <Chip
                label={`${criticalAlertsCount} Critical`}
                color="error"
                size="small"
                icon={<Error />}
              />
            )}
          </Box>
        }
        action={
          <Box display="flex" gap={1}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                label="Severity"
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="CRITICAL">Critical</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="ACKNOWLEDGED">Acknowledged</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="RESOLVED">Resolved</MenuItem>
              </Select>
            </FormControl>
          </Box>
        }
      />
      <CardContent>
        {loading ? (
          <Typography textAlign="center" color="textSecondary">
            Loading alerts...
          </Typography>
        ) : filteredAlerts.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Notifications color="disabled" sx={{ fontSize: 48 }} />
            <Typography variant="body2" color="textSecondary" mt={2}>
              No alerts found
            </Typography>
          </Box>
        ) : (
          <List>
            {filteredAlerts.map((alert, index) => (
              <React.Fragment key={alert.id}>
                <ListItem
                  alignItems="flex-start"
                  secondaryAction={
                    <IconButton edge="end" onClick={(e) => handleMenuClick(e, alert)}>
                      <MoreVert />
                    </IconButton>
                  }
                  sx={{
                    backgroundColor: alert.status === 'ACTIVE' ? 'action.hover' : 'transparent',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemIcon>
                    <Box
                      sx={{
                        backgroundColor: severityConfig[alert.severity].color,
                        borderRadius: '50%',
                        p: 0.5,
                        color: 'white',
                      }}
                    >
                      {severityConfig[alert.severity].icon}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1" fontWeight="bold">
                          {alert.title}
                        </Typography>
                        {alert.competitorName && (
                          <Chip label={alert.competitorName} size="small" variant="outlined" />
                        )}
                        <Chip
                          label={statusConfig[alert.status].label}
                          color={statusConfig[alert.status].color}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {alert.description && (
                          <Typography variant="body2" color="textSecondary" paragraph>
                            {alert.description}
                          </Typography>
                        )}
                        {alert.recommendation && (
                          <Typography variant="body2" color="primary" paragraph>
                            <strong>Recommendation:</strong> {alert.recommendation}
                          </Typography>
                        )}
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="caption" color="textSecondary">
                            {formatDistanceToNow(new Date(alert.createdAt))} ago
                          </Typography>
                          {alert.acknowledgedAt && (
                            <Typography variant="caption" color="textSecondary">
                              • Acknowledged by {alert.acknowledgedBy}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredAlerts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedAlert?.status === 'ACTIVE' && (
          <MenuItem onClick={handleAcknowledge}>
            <CheckCircle sx={{ mr: 1 }} />
            Acknowledge
          </MenuItem>
        )}
        <MenuItem onClick={() => selectedAlert && onViewDetails(selectedAlert)}>
          <Typography>View Details</Typography>
        </MenuItem>
        {selectedAlert?.status === 'ACTIVE' && (
          <MenuItem onClick={handleDismiss} sx={{ color: 'error.main' }}>
            Dismiss
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};
