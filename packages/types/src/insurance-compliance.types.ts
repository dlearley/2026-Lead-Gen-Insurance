export interface LicenseVerificationResult {
  verified: boolean;
  licenseNumber: string;
  licenseType: string;
  states: string[];
  lines: string[];
  status: "Active" | "Suspended" | "Revoked" | "Expired";
  expiryDate: Date;
}

export interface LicenseStatus {
  status: "Active" | "Expired" | "Suspended" | "NoLicense" | "Pending";
  lastChecked: Date;
}

export interface ExternalVerificationResult {
  verified: boolean;
  licenseNumber: string;
  status: string;
  expiryDate: Date;
  states: string[];
  lines: string[];
  source: string;
  licenseType?: string;
}

export interface AuthorityValidation {
  canSell: boolean;
  reason?: string;
  licenseStatus: string;
  appointmentStatus: string;
  applicableRules: string[];
}

export interface ComplianceResult {
  compliant: boolean;
  violations: Violation[];
  warnings: string[];
  appliedRules: string[];
  requiresManualReview: boolean;
}

export interface Violation {
  ruleId: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
}

export interface ViolationData {
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
}

export interface FairLendingResult {
  compliant: boolean;
  discriminatoryFactorsDetected: string[];
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  recommendations: string[];
}

export interface DisparateImpactMetrics {
  periodId: string;
  products: {
    [key: string]: {
      totalApplications: number;
      approvalRateByClass: Record<string, number>;
      disparateImpactDetected: boolean;
      disparityRatio: number;
    };
  };
}

export interface ProductRules {
  productType: string;
  jurisdiction: string;
  rules: any[];
}

export interface RuleEvaluationResult {
  ruleId: string;
  passed: boolean;
  message?: string;
}

export interface UnderwritingDecision {
  action: "Approve" | "Decline" | "ManualReview" | "RequestInfo" | "CounterOffer";
  reasoning: string;
  appliedRules: string[];
}

export interface ReasoningValidation {
  valid: boolean;
  issues: string[];
}

export interface AppealResult {
  appealId: string;
  status: string;
}

export interface DisparateImpactAnalysis {
  product: string;
  period: string;
  metrics: any;
}
