/**
 * Feature Validators
 *
 * Provides validation rules and checks for feature values.
 * Ensures data quality and integrity of features in the feature store.
 */

import type {
  FeatureMetadata,
  FeatureValidationRule,
  FeatureValidationResult,
  FeatureDataType,
  DataQualityCheckType,
  QualityTrend,
} from '@insurance-lead-gen/types';

/**
 * Validator Configuration
 */
export interface ValidatorConfig {
  strictMode: boolean;
  logValidationFailures: boolean;
  collectSamples: boolean;
  maxSampleSize: number;
}

/**
 * Feature Validator Class
 */
export class FeatureValidators {
  private config: ValidatorConfig;
  private validationRules: Map<string, FeatureValidationRule[]>;
  private validationHistory: Map<string, number[]>;

  constructor(config?: Partial<ValidatorConfig>) {
    this.config = {
      strictMode: false,
      logValidationFailures: true,
      collectSamples: true,
      maxSampleSize: 100,
      ...config,
    };

    this.validationRules = new Map();
    this.validationHistory = new Map();
  }

  /**
   * Add validation rule for a feature
   */
  addRule(featureName: string, rule: FeatureValidationRule): void {
    if (!this.validationRules.has(featureName)) {
      this.validationRules.set(featureName, []);
    }

    this.validationRules.get(featureName)!.push(rule);
  }

  /**
   * Add multiple validation rules for a feature
   */
  addRules(featureName: string, rules: FeatureValidationRule[]): void {
    for (const rule of rules) {
      this.addRule(featureName, rule);
    }
  }

  /**
   * Validate a feature value against its rules
   */
  validate(featureName: string, value: unknown, metadata?: FeatureMetadata): FeatureValidationResult {
    const rules = this.validationRules.get(featureName);
    if (!rules || rules.length === 0) {
      return {
        featureName,
        isValid: true,
        errors: [],
        warnings: [],
        info: [],
        validatedAt: new Date(),
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    for (const rule of rules) {
      const result = this.validateValue(value, rule, metadata);

      if (!result.valid && rule.severity === 'error') {
        errors.push(result.message);
      } else if (!result.valid && rule.severity === 'warning') {
        warnings.push(result.message);
      } else {
        info.push(result.message);
      }
    }

    const isValid = errors.length === 0;

    if (!isValid && this.config.logValidationFailures) {
      console.warn(`Feature validation failed for ${featureName}:`, errors);
    }

    return {
      featureName,
      isValid,
      errors,
      warnings,
      info,
      validatedAt: new Date(),
    };
  }

  /**
   * Validate a value against a single rule
   */
  private validateValue(value: unknown, rule: FeatureValidationRule, metadata?: FeatureMetadata): {
    valid: boolean;
    message: string;
  } {
    switch (rule.ruleType) {
      case 'range':
        return this.validateRange(value, rule);
      case 'regex':
        return this.validateRegex(value, rule);
      case 'enum':
        return this.validateEnum(value, rule);
      case 'custom':
        return this.validateCustom(value, rule);
      default:
        return { valid: true, message: 'Unknown rule type' };
    }
  }

  /**
   * Validate numeric range
   */
  private validateRange(value: unknown, rule: FeatureValidationRule): {
    valid: boolean;
    message: string;
  } {
    const min = rule.configuration.min as number;
    const max = rule.configuration.max as number;

    if (typeof value !== 'number') {
      return {
        valid: !this.config.strictMode,
        message: `Value is not a number: ${typeof value}`,
      };
    }

    const inRange = value >= min && value <= max;

    return {
      valid: inRange || !this.config.strictMode,
      message: inRange
        ? `Value ${value} is within range [${min}, ${max}]`
        : `Value ${value} is out of range [${min}, ${max}]`,
    };
  }

  /**
   * Validate regex pattern
   */
  private validateRegex(value: unknown, rule: FeatureValidationRule): {
    valid: boolean;
    message: string;
  } {
    const pattern = rule.configuration.pattern as string;

    if (typeof value !== 'string') {
      return {
        valid: !this.config.strictMode,
        message: `Value is not a string: ${typeof value}`,
      };
    }

    const regex = new RegExp(pattern);
    const matches = regex.test(value);

    return {
      valid: matches || !this.config.strictMode,
      message: matches
        ? `Value matches pattern: ${pattern}`
        : `Value does not match pattern: ${pattern}`,
    };
  }

  /**
   * Validate enum values
   */
  private validateEnum(value: unknown, rule: FeatureValidationRule): {
    valid: boolean;
    message: string;
  } {
    const allowedValues = rule.configuration.allowedValues as unknown[];

    const isValid = allowedValues.includes(value);

    return {
      valid: isValid || !this.config.strictMode,
      message: isValid
        ? `Value is allowed: ${value}`
        : `Value ${value} is not in allowed values: ${allowedValues.join(', ')}`,
    };
  }

  /**
   * Custom validation
   */
  private validateCustom(value: unknown, rule: FeatureValidationRule): {
    valid: boolean;
    message: string;
  } {
    const validator = rule.configuration.validator as (value: unknown) => {
      valid: boolean;
      message: string;
    };

    if (typeof validator !== 'function') {
      return {
        valid: !this.config.strictMode,
        message: 'Invalid custom validator function',
      };
    }

    return validator(value);
  }

  /**
   * Validate multiple feature values
   */
  validateBatch(features: Record<string, { value: unknown; metadata?: FeatureMetadata }>): {
    results: Map<string, FeatureValidationResult>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
    };
  } {
    const results = new Map<string, FeatureValidationResult>();
    let validCount = 0;
    let invalidCount = 0;

    for (const [featureName, { value, metadata }] of Object.entries(features)) {
      const result = this.validate(featureName, value, metadata);
      results.set(featureName, result);

      if (result.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    return {
      results,
      summary: {
        total: features.size,
        valid: validCount,
        invalid: invalidCount,
      },
    };
  }

  /**
   * Get validation rules for a feature
   */
  getRules(featureName: string): FeatureValidationRule[] {
    return this.validationRules.get(featureName) || [];
  }

  /**
   * List all features with validation rules
   */
  listFeaturesWithRules(): string[] {
    return Array.from(this.validationRules.keys());
  }

  /**
   * Remove validation rule
   */
  removeRule(featureName: string, ruleName: string): void {
    const rules = this.validationRules.get(featureName);
    if (rules) {
      const index = rules.findIndex((r) => r.ruleName === ruleName);
      if (index !== -1) {
        rules.splice(index, 1);
      }
    }
  }

  /**
   * Remove all rules for a feature
   */
  removeAllRules(featureName: string): void {
    this.validationRules.delete(featureName);
  }

  /**
   * Track validation score history
   */
  trackValidationScore(featureName: string, score: number): void {
    if (!this.validationHistory.has(featureName)) {
      this.validationHistory.set(featureName, []);
    }

    const history = this.validationHistory.get(featureName)!;
    history.push(score);

    // Keep only last 20 scores
    if (history.length > 20) {
      history.shift();
    }
  }

  /**
   * Get validation trend for a feature
   */
  getValidationTrend(featureName: string): QualityTrend | undefined {
    const history = this.validationHistory.get(featureName);
    if (!history || history.length < 2) {
      return undefined;
    }

    const currentScore = history[history.length - 1];
    const previousScore = history[history.length - 2];
    const change = currentScore - previousScore;

    let direction: 'improving' | 'declining' | 'stable';
    if (Math.abs(change) < 5) {
      direction = 'stable';
    } else if (change > 0) {
      direction = 'improving';
    } else {
      direction = 'declining';
    }

    return {
      checkName: featureName,
      scores: history,
      dates: [],
      direction,
    };
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalFeatures: number;
    totalRules: number;
    averageRulesPerFeature: number;
    featuresWithHistory: number;
  } {
    let totalRules = 0;

    for (const rules of this.validationRules.values()) {
      totalRules += rules.length;
    }

    return {
      totalFeatures: this.validationRules.size,
      totalRules,
      averageRulesPerFeature:
        this.validationRules.size > 0 ? totalRules / this.validationRules.size : 0,
      featuresWithHistory: this.validationHistory.size,
    };
  }
}

/**
 * Predefined validation rules for common features
 */
export function createPredefinedValidationRules(): Map<string, FeatureValidationRule[]> {
  const rules = new Map<string, FeatureValidationRule[]>();

  // Behavioral feature rules
  rules.set('email_opens_count', [
    {
      featureName: 'email_opens_count',
      ruleName: 'non_negative',
      ruleType: 'range',
      configuration: { min: 0, max: 1000000 },
      severity: 'error',
    },
  ]);

  rules.set('email_clicks_count', [
    {
      featureName: 'email_clicks_count',
      ruleName: 'non_negative',
      ruleType: 'range',
      configuration: { min: 0, max: 1000000 },
      severity: 'error',
    },
  ]);

  rules.set('page_views_count', [
    {
      featureName: 'page_views_count',
      ruleName: 'non_negative',
      ruleType: 'range',
      configuration: { min: 0, max: 10000000 },
      severity: 'error',
    },
  ]);

  rules.set('time_on_site_avg', [
    {
      featureName: 'time_on_site_avg',
      ruleName: 'non_negative',
      ruleType: 'range',
      configuration: { min: 0, max: 86400 }, // Max 24 hours
      severity: 'error',
    },
  ]);

  rules.set('bounce_rate', [
    {
      featureName: 'bounce_rate',
      ruleName: 'percentage_range',
      ruleType: 'range',
      configuration: { min: 0, max: 100 },
      severity: 'error',
    },
  ]);

  // Demographic feature rules
  rules.set('company_size', [
    {
      featureName: 'company_size',
      ruleName: 'positive_integer',
      ruleType: 'range',
      configuration: { min: 1, max: 10000000 },
      severity: 'error',
    },
  ]);

  rules.set('company_revenue', [
    {
      featureName: 'company_revenue',
      ruleName: 'non_negative',
      ruleType: 'range',
      configuration: { min: 0, max: 1000000000000 },
      severity: 'error',
    },
  ]);

  rules.set('quality_score', [
    {
      featureName: 'quality_score',
      ruleName: 'percentage_range',
      ruleType: 'range',
      configuration: { min: 0, max: 100 },
      severity: 'error',
    },
  ]);

  rules.set('company_age', [
    {
      featureName: 'company_age',
      ruleName: 'non_negative',
      ruleType: 'range',
      configuration: { min: 0, max: 500 },
      severity: 'error',
    },
  ]);

  // Temporal feature rules
  rules.set('days_since_last_activity', [
    {
      featureName: 'days_since_last_activity',
      ruleName: 'non_negative',
      ruleType: 'range',
      configuration: { min: 0, max: 3650 }, // Max 10 years
      severity: 'error',
    },
  ]);

  rules.set('recency_score', [
    {
      featureName: 'recency_score',
      ruleName: 'percentage_range',
      ruleType: 'range',
      configuration: { min: 0, max: 100 },
      severity: 'error',
    },
  ]);

  rules.set('frequency_score', [
    {
      featureName: 'frequency_score',
      ruleName: 'percentage_range',
      ruleType: 'range',
      configuration: { min: 0, max: 100 },
      severity: 'error',
    },
  ]);

  rules.set('monetary_score', [
    {
      featureName: 'monetary_score',
      ruleName: 'percentage_range',
      ruleType: 'range',
      configuration: { min: 0, max: 100 },
      severity: 'error',
    },
  ]);

  // NLP feature rules
  rules.set('sentiment_score', [
    {
      featureName: 'sentiment_score',
      ruleName: 'sentiment_range',
      ruleType: 'range',
      configuration: { min: -1, max: 1 },
      severity: 'error',
    },
  ]);

  rules.set('intent_confidence', [
    {
      featureName: 'intent_confidence',
      ruleName: 'probability_range',
      ruleType: 'range',
      configuration: { min: 0, max: 1 },
      severity: 'error',
    },
  ]);

  rules.set('complexity_score', [
    {
      featureName: 'complexity_score',
      ruleName: 'probability_range',
      ruleType: 'range',
      configuration: { min: 0, max: 1 },
      severity: 'error',
    },
  ]);

  rules.set('formality_score', [
    {
      featureName: 'formality_score',
      ruleName: 'probability_range',
      ruleType: 'range',
      configuration: { min: 0, max: 1 },
      severity: 'error',
    },
  ]);

  // Competitive feature rules
  rules.set('product_fit_score', [
    {
      featureName: 'product_fit_score',
      ruleName: 'percentage_range',
      ruleType: 'range',
      configuration: { min: 0, max: 100 },
      severity: 'error',
    },
  ]);

  rules.set('integration_readiness_score', [
    {
      featureName: 'integration_readiness_score',
      ruleName: 'percentage_range',
      ruleType: 'range',
      configuration: { min: 0, max: 100 },
      severity: 'error',
    },
  ]);

  rules.set('budget_availability_score', [
    {
      featureName: 'budget_availability_score',
      ruleName: 'percentage_range',
      ruleType: 'range',
      configuration: { min: 0, max: 100 },
      severity: 'error',
    },
  ]);

  rules.set('market_position_score', [
    {
      featureName: 'market_position_score',
      ruleName: 'percentage_range',
      ruleType: 'range',
      configuration: { min: 0, max: 100 },
      severity: 'error',
    },
  ]);

  // Email validation
  rules.set('email', [
    {
      featureName: 'email',
      ruleName: 'email_format',
      ruleType: 'regex',
      configuration: {
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
      severity: 'error',
    },
  ]);

  // Phone validation
  rules.set('phone', [
    {
      featureName: 'phone',
      ruleName: 'phone_format',
      ruleType: 'regex',
      configuration: {
        pattern: '^\\+?[\\d\\s\\-()]{10,}$',
      },
      severity: 'warning', // Phone formats can vary
    },
  ]);

  // Status validation
  rules.set('status', [
    {
      featureName: 'status',
      ruleName: 'valid_status',
      ruleType: 'enum',
      configuration: {
        allowedValues: ['received', 'processing', 'qualified', 'routed', 'converted', 'rejected'],
      },
      severity: 'error',
    },
  ]);

  return rules;
}
