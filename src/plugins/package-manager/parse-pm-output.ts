/**
 * Shared parser for package manager (npm/pnpm) output
 */

import { createDiagnostic, type Diagnostic } from '../../types/index.js';
import type { OutputParser, ParseOptions } from '../parse-chain.js';
import { truncateLine } from '../../utils/validation.js';

interface PackageManagerParserConfig {
  warnRegex: RegExp;
  errorRegex: RegExp;
}

export function createPackageManagerParser(config: PackageManagerParserConfig): OutputParser {
  const { warnRegex, errorRegex } = config;

  return function parseOutput(options: ParseOptions): Diagnostic[] {
    const { tool, output } = options;
    const lines = output.split(/\r?\n/);
    const diagnostics: Diagnostic[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = truncateLine(lines[i]);
      const lineNumber = i + 1;

      const warnMatch = line.match(warnRegex);
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

      const errorMatch = line.match(errorRegex);
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
  };
}
