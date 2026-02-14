/**
 * Parser for ESLint JSON output
 */

import { createDiagnostic, type Diagnostic } from '../../types/index.js';
import type { ParseOptions } from '../parse-chain.js';

interface EslintMessage {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
}

interface EslintFileResult {
  filePath: string;
  messages: EslintMessage[];
  errorCount: number;
  warningCount: number;
}

export function parseEslintOutput(options: ParseOptions): Diagnostic[] {
  const { tool, output } = options;
  const diagnostics: Diagnostic[] = [];

  const trimmed = output.trim();
  if (!trimmed) {
    return diagnostics;
  }

  let results: EslintFileResult[];
  try {
    results = JSON.parse(trimmed);
  } catch {
    return diagnostics;
  }

  if (!Array.isArray(results)) {
    return diagnostics;
  }

  for (const fileResult of results) {
    for (const message of fileResult.messages) {
      diagnostics.push(
        createDiagnostic({
          tool,
          severity: message.severity === 2 ? 'error' : 'warning',
          message: message.message,
          code: message.ruleId || undefined,
          file: fileResult.filePath,
          line: message.line,
          column: message.column,
          logRange: { startLine: 0, endLine: 0 },
        })
      );
    }
  }

  return diagnostics;
}
