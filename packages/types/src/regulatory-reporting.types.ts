export interface ComplianceReport {
  id: string;
  reportType: string;
  jurisdiction: string;
  reportPeriod: string;
  status: 'Draft' | 'Review' | 'Approved' | 'Submitted';
  generatedDate: Date;
  metrics: Record<string, any>;
}

export interface DataBreachNotification {
  id: string;
  breachId: string;
  breachDate: Date;
  affectedRecords: number;
  status: 'Detected' | 'Investigating' | 'Notifying' | 'Resolved';
}

export interface RegulatorySubmission {
  id: string;
  submissionId: string;
  reportType: string;
  regulatoryBody: string;
  submissionDate: Date;
  status: 'Pending' | 'Submitted' | 'Acknowledged';
}

export interface RegulatoryDeadline {
  id: string;
  reportType: string;
  dueDate: Date;
  status: 'Upcoming' | 'Due' | 'Overdue' | 'Completed';
}
