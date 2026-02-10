import { describe, it, expect } from 'vitest';
import {
  isValidRunId,
  validateRunId,
  clamp,
  MAX_RAW_BYTE_LENGTH,
  MAX_LOG_LINE_COUNT,
  MAX_IN_MEMORY_OUTPUT,
} from '../../src/utils/validation.js';

describe('isValidRunId', () => {
  it('accepts valid UUID v4', () => {
    expect(isValidRunId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts uppercase UUID v4', () => {
    expect(isValidRunId('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects non-UUID strings', () => {
    expect(isValidRunId('abc-123')).toBe(false);
    expect(isValidRunId('not-a-uuid')).toBe(false);
    expect(isValidRunId('')).toBe(false);
  });

  it('rejects path traversal strings', () => {
    expect(isValidRunId('../etc/passwd')).toBe(false);
    expect(isValidRunId('../../etc/passwd')).toBe(false);
    expect(isValidRunId('..%2f..%2fetc%2fpasswd')).toBe(false);
  });

  it('rejects UUID-like strings with wrong version', () => {
    expect(isValidRunId('550e8400-e29b-31d4-a716-446655440000')).toBe(false);
  });

  it('rejects UUID-like strings with wrong variant', () => {
    expect(isValidRunId('550e8400-e29b-41d4-c716-446655440000')).toBe(false);
  });
});

describe('validateRunId', () => {
  it('does not throw for valid UUID', () => {
    expect(() => validateRunId('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
  });

  it('throws for invalid runId', () => {
    expect(() => validateRunId('abc-123')).toThrow('Invalid runId');
  });

  it('throws for path traversal attempt', () => {
    expect(() => validateRunId('../../etc/passwd')).toThrow('Invalid runId');
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });

  it('clamps to min when value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max when value is above', () => {
    expect(clamp(100, 0, 10)).toBe(10);
  });

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('returns max when value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('constants', () => {
  it('defines MAX_RAW_BYTE_LENGTH as 64KB', () => {
    expect(MAX_RAW_BYTE_LENGTH).toBe(65536);
  });

  it('defines MAX_LOG_LINE_COUNT as 500', () => {
    expect(MAX_LOG_LINE_COUNT).toBe(500);
  });

  it('defines MAX_IN_MEMORY_OUTPUT as 10MB', () => {
    expect(MAX_IN_MEMORY_OUTPUT).toBe(10 * 1024 * 1024);
  });
});
