import { logger } from '../logger.js';

export enum ConstraintType {
  NOT_NULL = 'NOT_NULL',
  UNIQUE = 'UNIQUE',
  FOREIGN_KEY = 'FOREIGN_KEY',
  CHECK = 'CHECK',
  EXCLUSION = 'EXCLUSION',
}

export enum DataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  TIMESTAMP = 'TIMESTAMP',
  JSON = 'JSON',
  ARRAY = 'ARRAY',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  UUID = 'UUID',
  DECIMAL = 'DECIMAL',
}

export interface ValidationRule {
  field: string;
  type: DataType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  defaultValue?: any;
  constraints?: ConstraintType[];
}

export interface ValidationError {
  field: string;
  message: string;
  type: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class DataValidator {
  private rules: Map<string, ValidationRule[]> = new Map();
  private customValidators: Map<string, (value: any, record: any) => boolean | string> = new Map();

  defineRules(tableName: string, rules: ValidationRule[]): void {
    this.rules.set(tableName, rules);
  }

  addCustomValidator(
    field: string,
    validator: (value: any, record: any) => boolean | string
  ): void {
    this.customValidators.set(field, validator);
  }

  validate(tableName: string, data: Record<string, any>): ValidationResult {
    const rules = this.rules.get(tableName);
    if (!rules) {
      return { isValid: true, errors: [] };
    }

    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const value = data[rule.field];
      const fieldErrors = this.validateField(rule.field, rule, value, data);
      errors.push(...fieldErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateField(
    fieldName: string,
    rule: ValidationRule,
    value: any,
    record: Record<string, any>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined) {
      if (rule.required) {
        errors.push({
          field: fieldName,
          message: `${fieldName} is required`,
          type: 'REQUIRED',
          value,
        });
      }
      return errors;
    }

    if (rule.type && !this.validateType(rule.type, value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be of type ${rule.type}`,
        type: 'TYPE_MISMATCH',
        value,
      });
    }

    if (rule.minLength !== undefined && String(value).length < rule.minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${rule.minLength} characters`,
        type: 'MIN_LENGTH',
        value,
      });
    }

    if (rule.maxLength !== undefined && String(value).length > rule.maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must not exceed ${rule.maxLength} characters`,
        type: 'MAX_LENGTH',
        value,
      });
    }

    if (rule.min !== undefined && Number(value) < rule.min) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${rule.min}`,
        type: 'MIN_VALUE',
        value,
      });
    }

    if (rule.max !== undefined && Number(value) > rule.max) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must not exceed ${rule.max}`,
        type: 'MAX_VALUE',
        value,
      });
    }

    if (rule.pattern && !rule.pattern.test(String(value))) {
      errors.push({
        field: fieldName,
        message: `${fieldName} format is invalid`,
        type: 'PATTERN_MISMATCH',
        value,
      });
    }

    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be one of: ${rule.enum.join(', ')}`,
        type: 'INVALID_ENUM',
        value,
      });
    }

    const customValidator = this.customValidators.get(fieldName);
    if (customValidator) {
      const result = customValidator(value, record);
      if (result !== true) {
        errors.push({
          field: fieldName,
          message: typeof result === 'string' ? result : `${fieldName} is invalid`,
          type: 'CUSTOM_VALIDATION',
          value,
        });
      }
    }

    return errors;
  }

  private validateType(type: DataType, value: any): boolean {
    switch (type) {
      case DataType.STRING:
        return typeof value === 'string';
      case DataType.NUMBER:
        return typeof value === 'number' && !isNaN(value);
      case DataType.INTEGER:
        return Number.isInteger(Number(value));
      case DataType.BOOLEAN:
        return typeof value === 'boolean';
      case DataType.DATE:
        return value instanceof Date || !isNaN(Date.parse(value));
      case DataType.TIMESTAMP:
        return value instanceof Date || !isNaN(Date.parse(value));
      case DataType.JSON:
        return typeof value === 'object' && value !== null;
      case DataType.ARRAY:
        return Array.isArray(value);
      case DataType.EMAIL:
        return this.validateEmail(value);
      case DataType.PHONE:
        return this.validatePhone(value);
      case DataType.URL:
        return this.validateUrl(value);
      case DataType.UUID:
        return this.validateUuid(value);
      case DataType.DECIMAL:
        return !isNaN(parseFloat(value));
      default:
        return true;
    }
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validatePhone(phone: string): boolean {
    const e164Regex = /^\+?[1-9]\d{1,14}$/;
    return e164Regex.test(phone.replace(/[\s-()]/g, ''));
  }

  private validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private validateUuid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

export const commonValidationRules: ValidationRule[] = [
  {
    field: 'id',
    type: DataType.UUID,
    required: true,
    constraints: [ConstraintType.UNIQUE],
  },
  {
    field: 'email',
    type: DataType.EMAIL,
    required: false,
    maxLength: 255,
    constraints: [ConstraintType.UNIQUE],
  },
  {
    field: 'phone',
    type: DataType.PHONE,
    required: false,
    maxLength: 20,
  },
  {
    field: 'status',
    type: DataType.STRING,
    required: true,
    enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'],
  },
  {
    field: 'createdAt',
    type: DataType.TIMESTAMP,
    required: true,
  },
  {
    field: 'updatedAt',
    type: DataType.TIMESTAMP,
    required: true,
  },
];

export class ConstraintValidator {
  static async checkUniqueConstraint(
    checkFn: (field: string, value: any) => Promise<boolean>
  ): Promise<boolean> {
    return true;
  }

  static async checkForeignKey(
    checkFn: (table: string, id: string | number) => Promise<boolean>
  ): Promise<boolean> {
    return true;
  }
}

export class BusinessRuleValidator {
  static validateLeadStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      RECEIVED: ['PROCESSING', 'REJECTED'],
      PROCESSING: ['QUALIFIED', 'REJECTED'],
      QUALIFIED: ['ROUTED', 'REJECTED'],
      ROUTED: ['CONVERTED', 'REJECTED'],
      CONVERTED: [],
      REJECTED: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  static validateAgentCapacity(currentCount: number, maxCapacity: number): boolean {
    return currentCount < maxCapacity;
  }

  static validatePartnershipDates(startDate: Date, endDate?: Date): boolean {
    if (endDate) {
      return endDate > startDate;
    }
    return true;
  }

  static validateCommissionRate(rate: number): boolean {
    return rate >= 0 && rate <= 100;
  }

  static validatePerformanceScore(score: number): boolean {
    return score >= 0 && score <= 100;
  }
}
