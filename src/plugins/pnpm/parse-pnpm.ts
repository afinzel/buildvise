/**
 * Parser for pnpm output
 */

import { createDiagnostic, type Diagnostic } from '../../types/index.js';

const PNPM_WARN_REGEX = /^\s*WARN\s+(\w+)?\s*(.+)$/;
const PNPM_ERROR_REGEX = /^\s*ERR_PNPM_(\w+)\s+(.+)$/;

export interface ParsePnpmOptions {
  tool: string;
  output: string;
}

export function parsePnpmOutput(options: ParsePnpmOptions): Diagnostic[] {
  const { tool, output } = options;
  const lines = output.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    const warnMatch = line.match(PNPM_WARN_REGEX);
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

    const errorMatch = line.match(PNPM_ERROR_REGEX);
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
