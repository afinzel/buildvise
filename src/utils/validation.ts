/**
 * Shared validation utilities for input sanitization
 */

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MAX_RAW_BYTE_LENGTH = 65536;
export const MAX_LOG_LINE_COUNT = 500;
export const MAX_IN_MEMORY_OUTPUT = 10 * 1024 * 1024;

export function isValidRunId(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

export function validateRunId(runId: string): void {
  if (!isValidRunId(runId)) {
    throw new Error(`Invalid runId: ${runId}`);
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
