import {
  DuplicateCheckOptions,
  DuplicateCheckResult,
} from '@insurance-lead-gen/types';

export class DeduplicationService {
  checkDuplicate(
    newRecord: Record<string, unknown>,
    existingRecords: Array<Record<string, unknown>>,
    options: DuplicateCheckOptions = {},
  ): DuplicateCheckResult {
    const {
      matchByEmail = true,
      matchByPhone = true,
      matchByName = true,
      fuzzyMatchThreshold = 0.8,
    } = options;

    const duplicateCandidates: Array<{
      id: string;
      score: number;
      matchedFields: string[];
    }> = [];

    for (const existing of existingRecords) {
      const matchScore = this.calculateMatchScore(
        newRecord,
        existing,
        {
          matchByEmail,
          matchByPhone,
          matchByName,
        },
      );

      if (matchScore.score >= fuzzyMatchThreshold) {
        duplicateCandidates.push({
          id: existing.id as string,
          score: matchScore.score,
          matchedFields: matchScore.matchedFields,
        });
      }
    }

    duplicateCandidates.sort((a, b) => b.score - a.score);

    const isDuplicate = duplicateCandidates.length > 0;
    const topMatch = duplicateCandidates[0];

    return {
      isDuplicate,
      duplicateOf: topMatch?.id,
      matchScore: topMatch?.score || 0,
      matchedFields: topMatch?.matchedFields || [],
      duplicateCandidates,
    };
  }

  private calculateMatchScore(
    record1: Record<string, unknown>,
    record2: Record<string, unknown>,
    options: {
      matchByEmail: boolean;
      matchByPhone: boolean;
      matchByName: boolean;
    },
  ): { score: number; matchedFields: string[] } {
    let totalWeight = 0;
    let matchedWeight = 0;
    const matchedFields: string[] = [];

    if (options.matchByEmail) {
      totalWeight += 0.4;
      const email1 = this.normalizeString(record1.email as string);
      const email2 = this.normalizeString(record2.email as string);

      if (email1 && email2 && email1 === email2) {
        matchedWeight += 0.4;
        matchedFields.push('email');
      }
    }

    if (options.matchByPhone) {
      totalWeight += 0.3;
      const phone1 = this.normalizePhone(record1.phone as string);
      const phone2 = this.normalizePhone(record2.phone as string);

      if (phone1 && phone2 && phone1 === phone2) {
        matchedWeight += 0.3;
        matchedFields.push('phone');
      }
    }

    if (options.matchByName) {
      totalWeight += 0.3;
      const name1 = this.getFullName(record1);
      const name2 = this.getFullName(record2);

      if (name1 && name2) {
        const nameSimilarity = this.calculateLevenshteinSimilarity(name1, name2);
        if (nameSimilarity > 0.85) {
          matchedWeight += 0.3 * nameSimilarity;
          matchedFields.push('name');
        }
      }
    }

    return {
      score: totalWeight > 0 ? matchedWeight / totalWeight : 0,
      matchedFields,
    };
  }

  private normalizeString(value: string | undefined | null): string {
    if (!value) return '';
    return value.toLowerCase().trim();
  }

  private normalizePhone(phone: string | undefined | null): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  private getFullName(record: Record<string, unknown>): string {
    const firstName = this.normalizeString(record.firstName as string);
    const lastName = this.normalizeString(record.lastName as string);
    return `${firstName} ${lastName}`.trim();
  }

  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async checkBulkDuplicates(
    newRecords: Array<Record<string, unknown>>,
    existingRecords: Array<Record<string, unknown>>,
    options: DuplicateCheckOptions = {},
  ): Promise<Map<number, DuplicateCheckResult>> {
    const results = new Map<number, DuplicateCheckResult>();

    for (let i = 0; i < newRecords.length; i++) {
      const result = this.checkDuplicate(newRecords[i], existingRecords, options);
      results.set(i, result);
    }

    return results;
  }

  mergeRecords(
    record1: Record<string, unknown>,
    record2: Record<string, unknown>,
    strategy: 'prefer_new' | 'prefer_existing' | 'merge' = 'merge',
  ): Record<string, unknown> {
    if (strategy === 'prefer_new') {
      return { ...record2, ...record1 };
    }

    if (strategy === 'prefer_existing') {
      return { ...record1, ...record2 };
    }

    const merged: Record<string, unknown> = { ...record1 };

    for (const [key, value] of Object.entries(record2)) {
      if (merged[key] == null || merged[key] === '') {
        merged[key] = value;
      }
    }

    return merged;
  }
}

export const deduplicationService = new DeduplicationService();
