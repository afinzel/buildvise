/**
 * Tool response types
 */

import type { Diagnostic } from './diagnostic.js';
import type { TestSummary } from './test-summary.js';

/**
 * Simplified diagnostic for LLM consumption
 */
export interface SimpleDiagnostic {
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
}

export interface ToolResponse {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error diagnostics (omitted if empty) */
  errors?: SimpleDiagnostic[];
  /** Warning diagnostics (omitted if empty) */
  warnings?: SimpleDiagnostic[];
  /** Run ID for raw output retrieval */
  runId: string;
  /** Test summary (for test plugins) */
  summary?: TestSummary;
}

/**
 * Convert full diagnostic to simplified form
 */
function simplifyDiagnostic(d: Diagnostic): SimpleDiagnostic {
  const simple: SimpleDiagnostic = { message: d.message };
  if (d.file) simple.file = d.file;
  if (d.line) simple.line = d.line;
  if (d.column) simple.column = d.column;
  if (d.code) simple.code = d.code;
  return simple;
}

export interface ResponseOptions {
  summary?: TestSummary;
}

/**
 * Create a successful tool response
 */
export function createSuccessResponse(
  runId: string,
  warnings: Diagnostic[] = [],
  options: ResponseOptions = {}
): ToolResponse {
  const response: ToolResponse = { success: true, runId };
  if (warnings.length > 0) {
    response.warnings = warnings.map(simplifyDiagnostic);
  }
  if (options.summary) {
    response.summary = options.summary;
  }
  return response;
}

/**
 * Create a failed tool response
 */
export function createErrorResponse(
  runId: string,
  errors: Diagnostic[],
  warnings: Diagnostic[] = [],
  options: ResponseOptions = {}
): ToolResponse {
  const response: ToolResponse = {
    success: false,
    errors: errors.map(simplifyDiagnostic),
    runId,
  };
  if (warnings.length > 0) {
    response.warnings = warnings.map(simplifyDiagnostic);
  }
  if (options.summary) {
    response.summary = options.summary;
  }
  return response;
}
