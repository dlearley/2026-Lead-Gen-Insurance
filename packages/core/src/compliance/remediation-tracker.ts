// Remediation tracking and progress monitoring module
import {
  ComplianceSeverity,
  RemediationAction,
  VerificationRecord,
  EvidenceRecord,
  ComplianceStatus,
} from './types.js';
import { logger } from '../logger.js';

export class RemediationTracker {
  private actions: Map<string, RemediationAction> = new Map();
  private verificationRecords: Map<string, VerificationRecord[]> = new Map();
  private progressHistory: Map<string, any[]> = new Map();
  private milestones: Map<string, any> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Initialize sample remediation actions
    const sampleActions: RemediationAction[] = [
      {
        id: 'REM-001',
        title: 'Implement HIPAA Access Controls',
        description: 'Strengthen access controls for ePHI data',
        owner: 'Security Team',
        priority: ComplianceSeverity.HIGH,
        status: 'in_progress',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      {
        id: 'REM-002',
        title: 'Enhance GDPR Data Subject Rights',
        description: 'Implement automated data subject rights processing',
        owner: 'Privacy Team',
        priority: ComplianceSeverity.HIGH,
        status: 'pending',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      },
      {
        id: 'REM-003',
        title: 'Update Vendor Contracts',
        description: 'Add missing breach notification clauses',
        owner: 'Legal Team',
        priority: ComplianceSeverity.MEDIUM,
        status: 'in_progress',
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      },
      {
        id: 'REM-004',
        title: 'Fix Audit Trail Gaps',
        description: 'Implement missing audit trail for data modifications',
        owner: 'Development Team',
        priority: ComplianceSeverity.CRITICAL,
        status: 'in_progress',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      {
        id: 'REM-005',
        title: 'SOX Control Enhancement',
        description: 'Strengthen dual authorization for large transactions',
        owner: 'Finance Team',
        priority: ComplianceSeverity.HIGH,
        status: 'completed',
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Completed 7 days ago
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const action of sampleActions) {
      this.actions.set(action.id, action);
      this.initializeProgressHistory(action.id);
    }

    // Initialize milestones
    const milestones = [
      {
        id: 'MILESTONE-001',
        title: 'Critical Issues Resolution',
        description: 'Resolve all critical compliance issues',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'in_progress',
        relatedActions: ['REM-004'],
      },
      {
        id: 'MILESTONE-002',
        title: 'GDPR Compliance Implementation',
        description: 'Achieve full GDPR compliance',
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'planned',
        relatedActions: ['REM-002'],
      },
      {
        id: 'MILESTONE-003',
        title: 'Vendor Risk Mitigation',
        description: 'Complete vendor contract updates',
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'planned',
        relatedActions: ['REM-003'],
      },
    ];

    for (const milestone of milestones) {
      this.milestones.set(milestone.id, milestone);
    }
  }

  private initializeProgressHistory(actionId: string): void {
    const history = [
      {
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        status: 'pending',
        notes: 'Remediation action created',
        updatedBy: 'Compliance Team',
      },
      {
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        status: 'in_progress',
        notes: 'Started implementation',
        updatedBy: 'Action Owner',
      },
      {
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'in_progress',
        notes: 'Implementation ongoing',
        updatedBy: 'Action Owner',
      },
    ];

    this.progressHistory.set(actionId, history);
  }

  async createRemediationAction(
    action: Omit<RemediationAction, 'id' | 'status'>,
    findingId?: string
  ): Promise<RemediationAction> {
    logger.info('Creating remediation action', { action, findingId });

    const newAction: RemediationAction = {
      id: `REM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      status: 'pending',
      ...action,
    };

    this.actions.set(newAction.id, newAction);
    this.initializeProgressHistory(newAction.id);

    logger.info('Remediation action created', { actionId: newAction.id });

    return newAction;
  }

  async updateRemediationStatus(
    actionId: string,
    status: RemediationAction['status'],
    notes?: string,
    updatedBy?: string
  ): Promise<void> {
    logger.info('Updating remediation status', { actionId, status, notes });

    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Remediation action ${actionId} not found`);
    }

    // Update action status
    action.status = status;
    if (status === 'completed') {
      action.completedAt = new Date();
    }

    // Add progress history entry
    const history = this.progressHistory.get(actionId) || [];
    history.push({
      timestamp: new Date(),
      status,
      notes: notes || `Status updated to ${status}`,
      updatedBy: updatedBy || 'System',
    });
    this.progressHistory.set(actionId, history);

    // Update milestone status if applicable
    await this.updateMilestoneStatus(actionId);

    logger.info('Remediation status updated', { actionId, status });
  }

  async addVerificationRecord(
    actionId: string,
    verification: Omit<VerificationRecord, 'verifiedAt'>
  ): Promise<void> {
    logger.info('Adding verification record', { actionId, verification });

    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Remediation action ${actionId} not found`);
    }

    const verificationRecord: VerificationRecord = {
      ...verification,
      verifiedAt: new Date(),
    };

    const records = this.verificationRecords.get(actionId) || [];
    records.push(verificationRecord);
    this.verificationRecords.set(actionId, records);

    // Update action verification status
    action.verification = verificationRecord;

    logger.info('Verification record added', { actionId });
  }

  async verifyRemediationCompletion(
    actionId: string,
    verification: {
      verifiedBy: string;
      method: string;
      evidence: string[];
      result: ComplianceStatus;
      notes?: string;
    }
  ): Promise<void> {
    logger.info('Verifying remediation completion', { actionId, verification });

    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Remediation action ${actionId} not found`);
    }

    if (action.status !== 'completed') {
      throw new Error('Cannot verify completion of non-completed action');
    }

    await this.addVerificationRecord(actionId, verification);

    // If verification is successful, mark as verified
    if (verification.result === ComplianceStatus.COMPLIANT) {
      action.verification = {
        ...verification,
        verifiedAt: new Date(),
      };
      logger.info('Remediation verified as compliant', { actionId });
    } else {
      // If verification fails, mark action for re-work
      action.status = 'in_progress';
      logger.warn('Remediation verification failed', { actionId, result: verification.result });
    }
  }

  async getRemediationProgress(
    filter?: {
      owner?: string;
      priority?: ComplianceSeverity;
      status?: RemediationAction['status'];
      overdue?: boolean;
    }
  ): Promise<{
    summary: any;
    actions: RemediationAction[];
    progressMetrics: any;
    trends: any[];
  }> {
    logger.info('Getting remediation progress', { filter });

    let filteredActions = Array.from(this.actions.values());

    // Apply filters
    if (filter) {
      if (filter.owner) {
        filteredActions = filteredActions.filter(a => a.owner === filter.owner);
      }
      if (filter.priority) {
        filteredActions = filteredActions.filter(a => a.priority === filter.priority);
      }
      if (filter.status) {
        filteredActions = filteredActions.filter(a => a.status === filter.status);
      }
      if (filter.overdue) {
        const now = new Date();
        filteredActions = filteredActions.filter(a => 
          a.dueDate && a.dueDate < now && a.status !== 'completed'
        );
      }
    }

    // Calculate summary statistics
    const total = filteredActions.length;
    const completed = filteredActions.filter(a => a.status === 'completed').length;
    const inProgress = filteredActions.filter(a => a.status === 'in_progress').length;
    const pending = filteredActions.filter(a => a.status === 'pending').length;
    const overdue = filteredActions.filter(a => 
      a.dueDate && a.dueDate < new Date() && a.status !== 'completed'
    ).length;

    const critical = filteredActions.filter(a => a.priority === ComplianceSeverity.CRITICAL).length;
    const high = filteredActions.filter(a => a.priority === ComplianceSeverity.HIGH).length;
    const medium = filteredActions.filter(a => a.priority === ComplianceSeverity.MEDIUM).length;
    const low = filteredActions.filter(a => a.priority === ComplianceSeverity.LOW).length;

    // Calculate progress metrics
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const onTimeCompletionRate = this.calculateOnTimeCompletionRate(filteredActions);
    const averageCompletionTime = this.calculateAverageCompletionTime(filteredActions);
    const verificationSuccessRate = this.calculateVerificationSuccessRate(filteredActions);

    // Generate trends (simulated data)
    const trends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      trends.push({
        date,
        completed: Math.round(Math.random() * 10),
        created: Math.round(Math.random() * 8),
        overdue: Math.round(Math.random() * 3),
      });
    }

    const summary = {
      total,
      completed,
      inProgress,
      pending,
      overdue,
      completionRate: Math.round(completionRate * 100) / 100,
      priorityBreakdown: {
        critical: critical,
        high: high,
        medium: medium,
        low: low,
      },
    };

    const progressMetrics = {
      completionRate: Math.round(completionRate * 100) / 100,
      onTimeCompletionRate: Math.round(onTimeCompletionRate * 100) / 100,
      averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
      verificationSuccessRate: Math.round(verificationSuccessRate * 100) / 100,
      overdueActions: overdue,
      criticalActions: critical,
    };

    return {
      summary,
      actions: filteredActions.sort((a, b) => {
        // Sort by priority, then by due date
        const priorityOrder = {
          [ComplianceSeverity.CRITICAL]: 0,
          [ComplianceSeverity.HIGH]: 1,
          [ComplianceSeverity.MEDIUM]: 2,
          [ComplianceSeverity.LOW]: 3,
        };

        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
      }),
      progressMetrics,
      trends,
    };
  }

  async getOverdueActions(): Promise<RemediationAction[]> {
    const now = new Date();
    return Array.from(this.actions.values()).filter(action => 
      action.dueDate && action.dueDate < now && action.status !== 'completed'
    );
  }

  async getUpcomingDeadlines(days: number = 30): Promise<RemediationAction[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return Array.from(this.actions.values()).filter(action => 
      action.dueDate && action.dueDate >= now && action.dueDate <= futureDate && action.status !== 'completed'
    ).sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));
  }

  async generateRemediationPlan(
    findings: any[],
    options: {
      prioritizeBy?: 'severity' | 'risk' | 'deadline';
      groupByOwner?: boolean;
    } = {}
  ): Promise<{
    plan: any;
    timeline: any[];
    resourceAllocation: any;
    riskAssessment: any;
  }> {
    logger.info('Generating remediation plan', { findings, options });

    // Create remediation actions for findings
    const actions: RemediationAction[] = [];
    
    for (const finding of findings) {
      const action: RemediationAction = {
        id: `REM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: `Address ${finding.title}`,
        description: `Remediate compliance gap: ${finding.description}`,
        owner: this.assignOwner(finding),
        priority: finding.severity,
        status: 'pending',
        dueDate: this.calculateDueDate(finding.severity),
      };
      
      actions.push(action);
      this.actions.set(action.id, action);
    }

    // Generate timeline
    const timeline = this.generateTimeline(actions, options.prioritizeBy);

    // Resource allocation
    const resourceAllocation = this.calculateResourceAllocation(actions);

    // Risk assessment
    const riskAssessment = this.assessRemediationRisks(actions);

    const plan = {
      totalActions: actions.length,
      criticalActions: actions.filter(a => a.priority === ComplianceSeverity.CRITICAL).length,
      highActions: actions.filter(a => a.priority === ComplianceSeverity.HIGH).length,
      estimatedDuration: this.calculateEstimatedDuration(actions),
      estimatedCost: this.calculateEstimatedCost(actions),
      riskLevel: riskAssessment.overallRisk,
      milestones: this.generatePlanMilestones(actions),
    };

    return {
      plan,
      timeline,
      resourceAllocation,
      riskAssessment,
    };
  }

  async getMilestoneProgress(): Promise<{
    milestones: any[];
    completionRate: number;
    upcomingDeadlines: any[];
  }> {
    const milestones = Array.from(this.milestones.values());
    const now = new Date();

    const updatedMilestones = milestones.map(milestone => {
      const relatedActions = milestone.relatedActions || [];
      const completedActions = relatedActions.filter(actionId => {
        const action = this.actions.get(actionId);
        return action && action.status === 'completed';
      });

      const progress = relatedActions.length > 0 ? (completedActions.length / relatedActions.length) * 100 : 0;
      
      let status = 'planned';
      if (progress === 100) {
        status = 'completed';
      } else if (progress > 0) {
        status = 'in_progress';
      }

      const overdue = milestone.targetDate < now && status !== 'completed';

      return {
        ...milestone,
        progress: Math.round(progress * 100) / 100,
        status,
        overdue,
        completedActions: completedActions.length,
        totalActions: relatedActions.length,
      };
    });

    const completedMilestones = updatedMilestones.filter(m => m.status === 'completed').length;
    const completionRate = updatedMilestones.length > 0 ? (completedMilestones / updatedMilestones.length) * 100 : 0;

    const upcomingDeadlines = updatedMilestones
      .filter(m => m.targetDate > now && m.status !== 'completed')
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
      .slice(0, 5); // Next 5 upcoming deadlines

    return {
      milestones: updatedMilestones,
      completionRate: Math.round(completionRate * 100) / 100,
      upcomingDeadlines,
    };
  }

  // Private helper methods
  private async updateMilestoneStatus(actionId: string): Promise<void> {
    for (const milestone of this.milestones.values()) {
      if (milestone.relatedActions && milestone.relatedActions.includes(actionId)) {
        const relatedActions = milestone.relatedActions;
        const completedActions = relatedActions.filter(id => {
          const action = this.actions.get(id);
          return action && action.status === 'completed';
        });

        const progress = relatedActions.length > 0 ? (completedActions.length / relatedActions.length) * 100 : 0;
        
        let status = 'planned';
        if (progress === 100) {
          status = 'completed';
        } else if (progress > 0) {
          status = 'in_progress';
        }

        milestone.status = status;
      }
    }
  }

  private calculateOnTimeCompletionRate(actions: RemediationAction[]): number {
    const completedActions = actions.filter(a => a.status === 'completed' && a.completedAt && a.dueDate);
    const onTimeActions = completedActions.filter(a => a.completedAt && a.dueDate && a.completedAt <= a.dueDate);
    
    return completedActions.length > 0 ? (onTimeActions.length / completedActions.length) * 100 : 100;
  }

  private calculateAverageCompletionTime(actions: RemediationAction[]): number {
    const completedActions = actions.filter(a => a.status === 'completed' && a.completedAt);
    
    if (completedActions.length === 0) return 0;

    const totalDays = completedActions.reduce((sum, action) => {
      // Simulate creation date (7 days before completion for completed actions)
      const createdDate = new Date(action.completedAt!.getTime() - 7 * 24 * 60 * 60 * 1000);
      const daysToComplete = (action.completedAt!.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return sum + daysToComplete;
    }, 0);

    return totalDays / completedActions.length;
  }

  private calculateVerificationSuccessRate(actions: RemediationAction[]): number {
    const verifiedActions = actions.filter(a => a.verification);
    const successfulVerifications = verifiedActions.filter(a => a.verification?.result === ComplianceStatus.COMPLIANT);
    
    return verifiedActions.length > 0 ? (successfulVerifications.length / verifiedActions.length) * 100 : 100;
  }

  private assignOwner(finding: any): string {
    // Logic to assign owner based on finding type and severity
    if (finding.domain === 'regulatory') return 'Compliance Team';
    if (finding.domain === 'data_privacy') return 'Privacy Team';
    if (finding.domain === 'financial') return 'Finance Team';
    if (finding.domain === 'security') return 'Security Team';
    if (finding.domain === 'third_party') return 'Procurement Team';
    return 'Compliance Team';
  }

  private calculateDueDate(priority: ComplianceSeverity): Date {
    const now = new Date();
    const daysMap = {
      [ComplianceSeverity.CRITICAL]: 7,
      [ComplianceSeverity.HIGH]: 30,
      [ComplianceSeverity.MEDIUM]: 60,
      [ComplianceSeverity.LOW]: 90,
    };

    const days = daysMap[priority] || 30;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private generateTimeline(actions: RemediationAction[], prioritizeBy?: string): any[] {
    // Sort actions based on priority
    const sortedActions = [...actions].sort((a, b) => {
      if (prioritizeBy === 'severity') {
        const priorityOrder = {
          [ComplianceSeverity.CRITICAL]: 0,
          [ComplianceSeverity.HIGH]: 1,
          [ComplianceSeverity.MEDIUM]: 2,
          [ComplianceSeverity.LOW]: 3,
        };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });

    return sortedActions.map(action => ({
      action: action.title,
      owner: action.owner,
      startDate: new Date(), // Assume start today
      dueDate: action.dueDate,
      priority: action.priority,
      status: action.status,
    }));
  }

  private calculateResourceAllocation(actions: RemediationAction[]): any {
    const allocation: Record<string, number> = {};
    
    for (const action of actions) {
      allocation[action.owner] = (allocation[action.owner] || 0) + 1;
    }

    const total = actions.length;
    const percentages = Object.entries(allocation).map(([owner, count]) => ({
      owner,
      count,
      percentage: Math.round((count / total) * 100 * 100) / 100,
    }));

    return {
      allocation: percentages,
      totalActions: total,
      busiestOwner: percentages.reduce((max, current) => current.count > max.count ? current : max),
    };
  }

  private assessRemediationRisks(actions: RemediationAction[]): any {
    const risks = [];

    const criticalActions = actions.filter(a => a.priority === ComplianceSeverity.CRITICAL);
    if (criticalActions.length > 3) {
      risks.push({
        risk: 'Too many critical actions',
        impact: 'high',
        probability: 'medium',
        mitigation: 'Prioritize critical actions and allocate additional resources',
      });
    }

    const actionsByOwner: Record<string, number> = {};
    for (const action of actions) {
      actionsByOwner[action.owner] = (actionsByOwner[action.owner] || 0) + 1;
    }

    const overloadedOwners = Object.entries(actionsByOwner).filter(([_, count]) => count > 5);
    if (overloadedOwners.length > 0) {
      risks.push({
        risk: 'Resource overload',
        impact: 'medium',
        probability: 'high',
        mitigation: 'Redistribute actions or provide additional resources',
      });
    }

    const overallRisk = risks.length === 0 ? 'low' : risks.length === 1 ? 'medium' : 'high';

    return {
      overallRisk,
      risks,
      riskScore: Math.min(risks.length * 25, 100),
    };
  }

  private calculateEstimatedDuration(actions: RemediationAction[]): string {
    const criticalDays = actions.filter(a => a.priority === ComplianceSeverity.CRITICAL).length * 7;
    const highDays = actions.filter(a => a.priority === ComplianceSeverity.HIGH).length * 30;
    const mediumDays = actions.filter(a => a.priority === ComplianceSeverity.MEDIUM).length * 60;
    const lowDays = actions.filter(a => a.priority === ComplianceSeverity.LOW).length * 90;

    const totalDays = criticalDays + highDays + mediumDays + lowDays;
    const weeks = Math.round(totalDays / 7);

    return `${weeks} weeks`;
  }

  private calculateEstimatedCost(actions: RemediationAction[]): number {
    // Simulate cost estimation based on priority and complexity
    const costMap = {
      [ComplianceSeverity.CRITICAL]: 50000,
      [ComplianceSeverity.HIGH]: 25000,
      [ComplianceSeverity.MEDIUM]: 10000,
      [ComplianceSeverity.LOW]: 5000,
    };

    return actions.reduce((total, action) => total + (costMap[action.priority] || 10000), 0);
  }

  private generatePlanMilestones(actions: RemediationAction[]): any[] {
    return [
      {
        milestone: 'Critical Issues Resolved',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        relatedActions: actions.filter(a => a.priority === ComplianceSeverity.CRITICAL).map(a => a.id),
      },
      {
        milestone: 'High Priority Issues Resolved',
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        relatedActions: actions.filter(a => a.priority === ComplianceSeverity.HIGH).map(a => a.id),
      },
      {
        milestone: 'All Issues Resolved',
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        relatedActions: actions.map(a => a.id),
      },
    ];
  }

  // Utility methods
  getAction(actionId: string): RemediationAction | undefined {
    return this.actions.get(actionId);
  }

  getAllActions(): RemediationAction[] {
    return Array.from(this.actions.values());
  }

  getProgressHistory(actionId: string): any[] {
    return this.progressHistory.get(actionId) || [];
  }

  getVerificationRecords(actionId: string): VerificationRecord[] {
    return this.verificationRecords.get(actionId) || [];
  }

  getMilestone(milestoneId: string): any {
    return this.milestones.get(milestoneId);
  }

  getAllMilestones(): any[] {
    return Array.from(this.milestones.values());
  }
}

export const remediationTracker = new RemediationTracker();