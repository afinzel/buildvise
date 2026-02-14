/**
 * Parser for Next.js build output (TypeScript errors)
 *
 * Next.js has a unique multi-line format:
 * ./app/page.tsx:10:5
 * Type error: Some error message
 */

import { createDiagnostic, type Diagnostic } from '../../types/index.js';
import type { ParseOptions } from '../parse-chain.js';
import { truncateLine } from '../../utils/validation.js';

// Matches file:line:col pattern (may start with ./)
const LOCATION_REGEX = /^(\.?\/?.+?\.[a-zA-Z]+):(\d+):(\d+)\s*$/;

// Matches "Type error: message"
const TYPE_ERROR_REGEX = /^Type error:\s*(.+)$/;

export function parseNextjsOutput(options: ParseOptions): Diagnostic[] {
  const { tool, output } = options;
  const lines = output.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const line = truncateLine(lines[i]);
    const nextLine = truncateLine(lines[i + 1]);

    const locationMatch = line.match(LOCATION_REGEX);
    if (!locationMatch) continue;

    const errorMatch = nextLine.match(TYPE_ERROR_REGEX);
    if (!errorMatch) continue;

    const [, file, lineNum, col] = locationMatch;
    const [, message] = errorMatch;
    const logLineNumber = i + 1;

    diagnostics.push(
      createDiagnostic({
        tool,
        severity: 'error',
        message: message.trim(),
        file,
        line: parseInt(lineNum, 10),
        column: parseInt(col, 10),
        logRange: { startLine: logLineNumber, endLine: logLineNumber + 1 },
      })
    );
  }

  return diagnostics;
}
