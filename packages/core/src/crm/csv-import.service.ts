import Papa from 'papaparse';
import { Readable } from 'stream';
import {
  ImportPreview,
  FieldType,
  ValidationRule,
  ImportProgress,
} from '@insurance-lead-gen/types';
import { validationService } from './validation.service.js';

export interface CsvImportOptions {
  delimiter?: string;
  header?: boolean;
  previewRows?: number;
  encoding?: BufferEncoding;
}

export class CsvImportService {
  async parsePreview(
    csvContent: string,
    options: CsvImportOptions = {},
  ): Promise<ImportPreview> {
    const {
      delimiter = ',',
      header = true,
      previewRows = 50,
    } = options;

    const parsed = Papa.parse<Record<string, unknown>>(csvContent, {
      header,
      delimiter,
      skipEmptyLines: true,
      preview: previewRows,
    });

    const headers = parsed.meta.fields || [];
    const rows = parsed.data;

    const detectedFieldTypes: Record<string, FieldType> = {};
    for (const headerName of headers) {
      detectedFieldTypes[headerName] = this.detectFieldType(rows, headerName);
    }

    const suggestedMappings = this.suggestMappings(headers);

    const rules = this.getDefaultImportRules();
    const validationWarnings = this.generateWarnings(rows, rules);

    return {
      headers,
      rows,
      totalRows: -1,
      previewRows: rows.length,
      detectedFieldTypes,
      suggestedMappings,
      validationWarnings,
    };
  }

  async parseStream(
    stream: Readable,
    onRow: (row: Record<string, unknown>, rowNumber: number) => Promise<void>,
    onProgress?: (progress: { processed: number; total?: number }) => void,
    options: CsvImportOptions = {},
  ): Promise<void> {
    const {
      delimiter = ',',
      header = true,
    } = options;

    let rowNumber = 0;

    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(stream as unknown as NodeJS.ReadableStream, {
        header,
        delimiter,
        skipEmptyLines: true,
        step: async (results, parser) => {
          parser.pause();
          rowNumber += 1;

          try {
            await onRow(results.data, rowNumber);

            if (onProgress && rowNumber % 100 === 0) {
              onProgress({ processed: rowNumber });
            }

            parser.resume();
          } catch (error) {
            parser.abort();
            reject(error);
          }
        },
        complete: () => {
          if (onProgress) {
            onProgress({ processed: rowNumber });
          }
          resolve();
        },
        error: error => {
          reject(error);
        },
      });
    });
  }

  detectFieldType(rows: Array<Record<string, unknown>>, field: string): FieldType {
    const values = rows
      .map(row => row[field])
      .filter(v => v != null && v !== '');

    if (values.length === 0) return 'STRING';

    const stringValues = values.map(v => String(v));

    const emailCount = stringValues.filter(v => v.includes('@')).length;
    if (emailCount / values.length > 0.8) return 'EMAIL';

    const phoneCount = stringValues.filter(v => /\d{3}/.test(v)).length;
    if (phoneCount / values.length > 0.8) return 'PHONE';

    const numberCount = stringValues.filter(v => !Number.isNaN(Number(v))).length;
    if (numberCount / values.length > 0.8) return 'NUMBER';

    const dateCount = stringValues.filter(v => !Number.isNaN(Date.parse(v))).length;
    if (dateCount / values.length > 0.8) return 'DATE';

    return 'STRING';
  }

  suggestMappings(headers: string[]): Array<{ sourceField: string; targetField: string; confidence: number }> {
    const standardFields = [
      { field: 'firstName', aliases: ['first name', 'firstname', 'first'] },
      { field: 'lastName', aliases: ['last name', 'lastname', 'last'] },
      { field: 'email', aliases: ['email', 'e-mail', 'mail'] },
      { field: 'phone', aliases: ['phone', 'mobile', 'telephone', 'cell'] },
      { field: 'street', aliases: ['street', 'address', 'addr'] },
      { field: 'city', aliases: ['city', 'town'] },
      { field: 'state', aliases: ['state', 'province', 'region'] },
      { field: 'zipCode', aliases: ['zip', 'zipcode', 'postal', 'postalcode'] },
      { field: 'insuranceType', aliases: ['insurance type', 'product', 'type'] },
    ];

    const suggestions: Array<{ sourceField: string; targetField: string; confidence: number }> = [];

    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      let bestMatch: { field: string; confidence: number } | null = null;

      for (const standard of standardFields) {
        for (const alias of standard.aliases) {
          if (normalized === alias) {
            bestMatch = { field: standard.field, confidence: 1.0 };
            break;
          }

          if (normalized.includes(alias) || alias.includes(normalized)) {
            const confidence = Math.min(normalized.length, alias.length) / Math.max(normalized.length, alias.length);
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { field: standard.field, confidence };
            }
          }
        }

        if (bestMatch?.confidence === 1.0) break;
      }

      if (bestMatch) {
        suggestions.push({
          sourceField: header,
          targetField: bestMatch.field,
          confidence: bestMatch.confidence,
        });
      }
    }

    return suggestions;
  }

  private generateWarnings(
    rows: Array<Record<string, unknown>>,
    rules: ValidationRule[],
  ): Array<{ row: number; field: string; message: string }> {
    const warnings: Array<{ row: number; field: string; message: string }> = [];

    rows.forEach((row, idx) => {
      const validation = validationService.validateRecord(row, rules);
      validation.warnings.forEach(w => {
        warnings.push({
          row: idx + 1,
          field: w.field,
          message: w.message,
        });
      });

      validation.errors.forEach(e => {
        warnings.push({
          row: idx + 1,
          field: e.field,
          message: e.message,
        });
      });
    });

    return warnings.slice(0, 100);
  }

  getDefaultImportRules(): ValidationRule[] {
    return [
      { field: 'email', type: 'email', message: 'Invalid email address' },
      { field: 'phone', type: 'phone', message: 'Invalid phone number' },
    ];
  }

  createProgress(jobId: string, totalRows: number): ImportProgress {
    return {
      jobId,
      status: 'PROCESSING',
      totalRows,
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      skippedRows: 0,
      duplicateRows: 0,
      percentage: 0,
      errors: [],
    };
  }

  updateProgress(
    progress: ImportProgress,
    update: Partial<Pick<ImportProgress, 'processedRows' | 'successRows' | 'failedRows' | 'skippedRows' | 'duplicateRows'>>,
  ): ImportProgress {
    const updated = { ...progress, ...update };
    updated.percentage = updated.totalRows > 0 ? Math.round((updated.processedRows / updated.totalRows) * 100) : 0;
    return updated;
  }
}

export const csvImportService = new CsvImportService();
