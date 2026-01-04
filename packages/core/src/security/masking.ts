/* eslint-disable @typescript-eslint/no-explicit-any */

export type MaskingStrategy = 'mask' | 'redact' | 'none';

export interface MaskingOptions {
  strategy?: MaskingStrategy;
}

export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) {
    return '***@***';
  }
  const domain = email.slice(at + 1);
  return `***@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***-***-****';
  const last4 = digits.slice(-4);
  return `***-***-${last4}`;
}

export function maskSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, '');
  if (digits.length < 4) return '***-**-****';
  const last4 = digits.slice(-4);
  return `***-**-${last4}`;
}

export function maskCreditCard(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return '****-****-****-****';
  const last4 = digits.slice(-4);
  return `****-****-****-${last4}`;
}

export function maskName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '***';
  return `${trimmed[0]}***`;
}

export function maskAddress(address: { city?: string | null; state?: string | null }): string {
  const city = address.city?.trim();
  const state = address.state?.trim();
  if (city && state) return `*****, ${city}, ${state}`;
  if (state) return `*****, ${state}`;
  if (city) return `*****, ${city}`;
  return '*****';
}

export function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  return '***REDACTED***';
}

export function deepRedact(obj: unknown, predicate: (keyPath: string[], value: unknown) => boolean): unknown {
  const walk = (value: unknown, keyPath: string[]): unknown => {
    if (predicate(keyPath, value)) {
      return redactValue(value);
    }

    if (Array.isArray(value)) {
      return value.map((v, idx) => walk(v, [...keyPath, String(idx)]));
    }

    if (value && typeof value === 'object') {
      const input = value as Record<string, unknown>;
      const output: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) {
        output[k] = walk(v, [...keyPath, k]);
      }
      return output;
    }

    return value;
  };

  return walk(obj, []);
}

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const ssnRegex = /\b\d{3}-?\d{2}-?\d{4}\b/g;
const creditCardRegex = /\b(?:\d[ -]*?){13,19}\b/g;

export function redactSensitiveStrings(input: string): string {
  return input
    .replace(emailRegex, (m) => maskEmail(m))
    .replace(ssnRegex, (m) => maskSSN(m))
    .replace(creditCardRegex, (m) => maskCreditCard(m));
}

export function maskCommonPIIFields<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const input = obj as Record<string, any>;
  const out: Record<string, any> = Array.isArray(input) ? [...input] : { ...input };

  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'string') {
      const key = k.toLowerCase();
      if (key.includes('email')) out[k] = maskEmail(v);
      else if (key.includes('phone')) out[k] = maskPhone(v);
      else if (key.includes('ssn') || key.includes('tax')) out[k] = maskSSN(v);
      else if (key.includes('card') || key.includes('cc')) out[k] = maskCreditCard(v);
      else if (key === 'firstname' || key === 'lastname' || key.includes('name')) out[k] = maskName(v);
      else out[k] = redactSensitiveStrings(v);
    } else if (v && typeof v === 'object') {
      out[k] = maskCommonPIIFields(v);
    }
  }

  return out as T;
}
