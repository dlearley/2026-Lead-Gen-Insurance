import validator from 'validator';
import {
  ValidationRule,
  ValidationResult,
  DataCleansingOptions,
  CleansingResult,
} from '@insurance-lead-gen/types';

export class DataValidationService {
  validateRecord(
    data: Record<string, unknown>,
    rules: ValidationRule[],
  ): ValidationResult {
    const errors: Array<{ field: string; message: string; value?: unknown }> = [];
    const warnings: Array<{ field: string; message: string; value?: unknown }> = [];

    for (const rule of rules) {
      const value = data[rule.field];
      const result = this.validateField(value, rule);

      if (!result.isValid) {
        errors.push({
          field: rule.field,
          message: result.message,
          value,
        });
      }

      if (result.warning) {
        warnings.push({
          field: rule.field,
          message: result.warning,
          value,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateField(
    value: unknown,
    rule: ValidationRule,
  ): { isValid: boolean; message: string; warning?: string } {
    const stringValue = value != null ? String(value) : '';

    switch (rule.type) {
      case 'required':
        if (value == null || stringValue.trim() === '') {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'email':
        if (value && !validator.isEmail(stringValue)) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'phone':
        if (value && !this.isValidPhone(stringValue)) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'date':
        if (value && !validator.isISO8601(stringValue)) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'number':
        if (value && !validator.isNumeric(stringValue)) {
          return { isValid: false, message: rule.message };
        }
        break;

      case 'regex':
        if (value && rule.params?.pattern) {
          const regex = new RegExp(rule.params.pattern as string);
          if (!regex.test(stringValue)) {
            return { isValid: false, message: rule.message };
          }
        }
        break;

      case 'enum':
        if (value && rule.params?.values) {
          const allowedValues = rule.params.values as string[];
          if (!allowedValues.includes(stringValue)) {
            return { isValid: false, message: rule.message };
          }
        }
        break;

      case 'custom':
        if (rule.params?.validator && typeof rule.params.validator === 'function') {
          const customValidator = rule.params.validator as (val: unknown) => boolean;
          if (value && !customValidator(value)) {
            return { isValid: false, message: rule.message };
          }
        }
        break;
    }

    return { isValid: true, message: '' };
  }

  private isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  cleanseData(
    data: Record<string, unknown>,
    options: DataCleansingOptions = {},
  ): CleansingResult {
    const cleaned: Record<string, unknown> = { ...data };
    const changes: Array<{
      field: string;
      from: unknown;
      to: unknown;
      reason: string;
    }> = [];

    for (const [field, value] of Object.entries(data)) {
      if (value == null) continue;

      let cleanedValue = value;
      let reason = '';

      if (typeof value === 'string') {
        if (options.trimStrings) {
          const trimmed = value.trim();
          if (trimmed !== value) {
            cleanedValue = trimmed;
            reason = 'trimmed whitespace';
          }
        }

        if (field.toLowerCase().includes('email') && options.normalizeEmail) {
          const normalized = this.normalizeEmail(value);
          if (normalized !== value) {
            cleanedValue = normalized;
            reason = 'normalized email';
          }
        }

        if (field.toLowerCase().includes('phone') && options.normalizePhone) {
          const normalized = this.normalizePhone(value);
          if (normalized !== value) {
            cleanedValue = normalized;
            reason = 'normalized phone';
          }
        }

        if (
          (field.toLowerCase().includes('name') || 
           field.toLowerCase().includes('firstname') || 
           field.toLowerCase().includes('lastname')) &&
          options.capitalizeName
        ) {
          const capitalized = this.capitalizeName(value);
          if (capitalized !== value) {
            cleanedValue = capitalized;
            reason = 'capitalized name';
          }
        }

        if (options.removeSpecialChars && this.hasSpecialChars(value)) {
          const cleaned = value.replace(/[^\w\s@.-]/g, '');
          if (cleaned !== value) {
            cleanedValue = cleaned;
            reason = 'removed special characters';
          }
        }
      }

      if (cleanedValue !== value) {
        cleaned[field] = cleanedValue;
        changes.push({
          field,
          from: value,
          to: cleanedValue,
          reason,
        });
      }
    }

    return {
      original: data,
      cleaned,
      changes,
    };
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    return cleaned;
  }

  private capitalizeName(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private hasSpecialChars(value: string): boolean {
    return /[^\w\s@.-]/.test(value);
  }

  validateBulk(
    records: Array<Record<string, unknown>>,
    rules: ValidationRule[],
  ): Array<{ index: number; result: ValidationResult }> {
    return records.map((record, index) => ({
      index,
      result: this.validateRecord(record, rules),
    }));
  }

  getStandardLeadRules(): ValidationRule[] {
    return [
      {
        field: 'email',
        type: 'email',
        message: 'Invalid email address',
      },
      {
        field: 'phone',
        type: 'phone',
        message: 'Invalid phone number',
      },
      {
        field: 'firstName',
        type: 'required',
        message: 'First name is required',
      },
      {
        field: 'lastName',
        type: 'required',
        message: 'Last name is required',
      },
      {
        field: 'insuranceType',
        type: 'enum',
        message: 'Invalid insurance type',
        params: {
          values: ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL'],
        },
      },
    ];
  }
}

export const validationService = new DataValidationService();
