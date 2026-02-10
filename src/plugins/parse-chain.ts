/**
 * Utility for chaining multiple output parsers
 */

import type { Diagnostic } from '../types/index.js';

export type OutputParser = (options: {
  tool: string;
  output: string;
}) => Diagnostic[];

/**
 * Runs multiple parsers on the same output and combines results.
 * Deduplicates diagnostics that appear in the same location.
 */
export function chainParsers(
  parsers: OutputParser[],
  options: { tool: string; output: string }
): Diagnostic[] {
  const allDiagnostics: Diagnostic[] = [];
  const seen = new Set<string>();

  for (const parser of parsers) {
    const diagnostics = parser(options);
    for (const diagnostic of diagnostics) {
      const key = `${diagnostic.file ?? ''}:${diagnostic.line ?? 0}:${diagnostic.column ?? 0}:${diagnostic.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        allDiagnostics.push(diagnostic);
      }
    }
  }

  return allDiagnostics;
}
