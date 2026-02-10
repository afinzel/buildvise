/**
 * Parser for TypeScript compiler (tsc) output
 */

import { createDiagnostic, type Diagnostic } from '../../types/index.js';

// Default format: src/foo.ts(10,5): error TS2322: message
const TSC_DEFAULT_REGEX =
  /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/;

// Pretty format: src/foo.ts:10:5 - error TS2322: message
const TSC_PRETTY_REGEX =
  /^(.+?):(\d+):(\d+)\s*-\s*(error|warning)\s+(TS\d+):\s*(.+)$/;

export interface ParseTypescriptOptions {
  tool: string;
  output: string;
}

export function parseTypescriptOutput(
  options: ParseTypescriptOptions
): Diagnostic[] {
  const { tool, output } = options;
  const lines = output.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    const defaultMatch = line.match(TSC_DEFAULT_REGEX);
    if (defaultMatch) {
      const [, file, lineNum, col, severity, code, message] = defaultMatch;
      diagnostics.push(
        createDiagnostic({
          tool,
          severity: severity === 'error' ? 'error' : 'warning',
          message: message.trim(),
          code,
          file,
          line: parseInt(lineNum, 10),
          column: parseInt(col, 10),
          logRange: { startLine: lineNumber, endLine: lineNumber },
        })
      );
      continue;
    }

    const prettyMatch = line.match(TSC_PRETTY_REGEX);
    if (prettyMatch) {
      const [, file, lineNum, col, severity, code, message] = prettyMatch;
      diagnostics.push(
        createDiagnostic({
          tool,
          severity: severity === 'error' ? 'error' : 'warning',
          message: message.trim(),
          code,
          file,
          line: parseInt(lineNum, 10),
          column: parseInt(col, 10),
          logRange: { startLine: lineNumber, endLine: lineNumber },
        })
      );
    }
  }

  return diagnostics;
}
