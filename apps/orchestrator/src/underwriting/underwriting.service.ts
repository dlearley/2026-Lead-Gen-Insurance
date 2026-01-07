import OpenAI from 'openai';

import { logger } from '@insurance-lead-gen/core';
import type {
  InsuranceType,
  Lead,
  Policy,
  UnderwritingResult,
  UnderwritingRiskLevel,
  UnderwritingDecision,
} from '@insurance-lead-gen/types';

export class UnderwritingService {
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey;
    this.model = options?.model || 'gpt-4o-mini';

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      logger.info('UnderwritingService initialized with OpenAI');
    } else {
      this.client = null;
      logger.warn('OPENAI_API_KEY not configured. UnderwritingService running in mock mode.');
    }
  }

  async underwrite(params: {
    lead: Lead;
    policy?: Policy;
    context?: Record<string, unknown>;
  }): Promise<UnderwritingResult> {
    const { lead, policy, context } = params;

    if (!this.client) {
      return this.mockUnderwrite({ lead, policy });
    }

    try {
      const prompt = this.createPrompt({ lead, policy, context });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert insurance underwriter. Respond with a strict JSON object matching the requested schema.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      const parsed = JSON.parse(content || '{}') as Partial<UnderwritingResult>;

      const evaluatedAt = parsed.evaluatedAt ? new Date(parsed.evaluatedAt) : new Date();

      const normalized: UnderwritingResult = {
        decision: (parsed.decision as UnderwritingDecision) || 'refer',
        riskScore: typeof parsed.riskScore === 'number' ? parsed.riskScore : 50,
        riskLevel: (parsed.riskLevel as UnderwritingRiskLevel) || 'medium',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.6,
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : ['AI underwriting decision'],
        requiredDocuments: Array.isArray(parsed.requiredDocuments)
          ? parsed.requiredDocuments.map(String)
          : [],
        recommendedActions: Array.isArray(parsed.recommendedActions)
          ? parsed.recommendedActions.map(String)
          : [],
        premiumAdjustment: parsed.premiumAdjustment,
        evaluatedAt,
        model: this.model,
      };

      return normalized;
    } catch (error) {
      logger.error('OpenAI underwriting failed, falling back to mock underwriting', {
        error,
        leadId: lead.id,
      });
      return this.mockUnderwrite({ lead, policy });
    }
  }

  private createPrompt(params: {
    lead: Lead;
    policy?: Policy;
    context?: Record<string, unknown>;
  }): string {
    const { lead, policy, context } = params;

    return `Evaluate underwriting for the following applicant.\n\nReturn JSON with:\n- decision: one of [approve, refer, decline]\n- riskScore: number 0-100 (higher = riskier)\n- riskLevel: one of [low, medium, high, critical]\n- confidence: number 0-1\n- reasons: string[]\n- requiredDocuments: string[]\n- recommendedActions: string[]\n- premiumAdjustment: { multiplier: number, notes?: string } (optional)\n\nLead:\n${JSON.stringify(lead, null, 2)}\n\nPolicy (optional):\n${JSON.stringify(policy ?? null, null, 2)}\n\nContext (optional):\n${JSON.stringify(context ?? null, null, 2)}\n`;
  }

  private mockUnderwrite(params: { lead: Lead; policy?: Policy }): UnderwritingResult {
    const { lead, policy } = params;

    const baseByType: Record<InsuranceType, number> = {
      auto: 45,
      home: 40,
      life: 35,
      health: 50,
      commercial: 55,
    };

    const insuranceType = (policy?.insuranceType ?? lead.insuranceType ?? 'auto') as InsuranceType;
    let riskScore = baseByType[insuranceType] ?? 50;

    const state = lead.address?.state;
    if (state === 'FL') riskScore += 12;
    if (state === 'CA') riskScore += 6;
    if (state === 'NY') riskScore += 6;
    if (state === 'TX') riskScore += 3;

    if (!lead.email) riskScore += 4;
    if (!lead.phone) riskScore += 4;

    const premiumAmount = policy?.premium?.amount;
    if (typeof premiumAmount === 'number' && premiumAmount > 5000) riskScore += 6;

    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

    const riskLevel: UnderwritingRiskLevel =
      riskScore < 30 ? 'low' : riskScore < 55 ? 'medium' : riskScore < 75 ? 'high' : 'critical';

    const decision: UnderwritingDecision =
      riskLevel === 'critical' ? 'decline' : riskLevel === 'high' ? 'refer' : 'approve';

    const requiredDocuments = this.getDefaultRequiredDocuments(insuranceType, decision);

    const premiumAdjustment =
      decision === 'approve'
        ? { multiplier: riskLevel === 'medium' ? 1.05 : 1.0, notes: 'Mock underwriting adjustment' }
        : decision === 'refer'
          ? { multiplier: 1.1, notes: 'Refer for review - suggested surcharge' }
          : undefined;

    return {
      decision,
      riskScore,
      riskLevel,
      confidence: decision === 'approve' ? 0.72 : decision === 'refer' ? 0.6 : 0.78,
      reasons: [
        `Mock underwriting for ${insuranceType}`,
        state ? `State risk factor: ${state}` : 'No state provided',
      ],
      requiredDocuments,
      recommendedActions:
        decision === 'approve'
          ? ['Proceed to payment and activation']
          : decision === 'refer'
            ? ['Collect required documents', 'Manual underwriter review']
            : ['Decline and notify applicant'],
      premiumAdjustment,
      evaluatedAt: new Date(),
      model: this.client ? this.model : 'mock',
    };
  }

  private getDefaultRequiredDocuments(
    insuranceType: InsuranceType,
    decision: UnderwritingDecision
  ): string[] {
    const baseDocsByType: Record<InsuranceType, string[]> = {
      auto: ['drivers_license', 'vehicle_registration'],
      home: ['property_photos', 'home_inspection_report'],
      life: ['medical_history', 'beneficiary_information'],
      health: ['medical_history', 'proof_of_coverage'],
      commercial: ['financial_statements', 'business_license', 'loss_runs'],
    };

    if (decision === 'decline') return [];
    return baseDocsByType[insuranceType] ?? [];
  }
}
