/**
 * Parser for npm output
 */

import { createDiagnostic, type Diagnostic } from '../../types/index.js';

const NPM_WARN_REGEX = /^npm warn\s+(\w+)?\s*(.*)$/;
const NPM_ERROR_REGEX = /^npm error\s+(?:code\s+)?(\w+)?\s*(.*)$/;

export interface ParseNpmOptions {
  tool: string;
  output: string;
}

export function parseNpmOutput(options: ParseNpmOptions): Diagnostic[] {
  const { tool, output } = options;
  const lines = output.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    const warnMatch = line.match(NPM_WARN_REGEX);
    if (warnMatch) {
      const [, code, message] = warnMatch;
      diagnostics.push(
        createDiagnostic({
          tool,
          severity: 'warning',
          message: message.trim(),
          code: code || undefined,
          logRange: { startLine: lineNumber, endLine: lineNumber },
        })
      );
      continue;
    }

    const errorMatch = line.match(NPM_ERROR_REGEX);
    if (errorMatch) {
      const [, code, message] = errorMatch;
      diagnostics.push(
        createDiagnostic({
          tool,
          severity: 'error',
          message: message.trim(),
          code: code || undefined,
          logRange: { startLine: lineNumber, endLine: lineNumber },
        })
      );
    }
  }

  return diagnostics;
}
