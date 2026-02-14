/**
 * Parser for dotnet build (MSBuild) output
 */

import { createDiagnostic, type Diagnostic, type Severity } from '../../types/index.js';
import type { ParseOptions } from '../parse-chain.js';
import { truncateLine } from '../../utils/validation.js';

// Source file diagnostics: path/File.cs(line,col): error CS1234: message
const MSBUILD_DIAGNOSTIC_REGEX =
  /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+)$/;

// Project-level diagnostics: Project.csproj : error MSB3021: message
// Also handles: MSBUILD : error MSB1234: message
const MSBUILD_PROJECT_ERROR_REGEX =
  /^(.+?)\s*:\s*(error|warning)\s+(\w+):\s*(.+)$/;

interface ParsedLine {
  lineNumber: number;
  diagnostic: Diagnostic | null;
}

export function parseBuildLine(
  rawLine: string,
  lineNumber: number,
  tool: string
): ParsedLine {
  const line = truncateLine(rawLine);
  // Try source file diagnostic first (has line/column)
  const sourceMatch = line.match(MSBUILD_DIAGNOSTIC_REGEX);
  if (sourceMatch) {
    const [, file, lineStr, colStr, severityStr, code, message] = sourceMatch;
    const severity: Severity = severityStr === 'error' ? 'error' : 'warning';

    const diagnostic = createDiagnostic({
      tool,
      severity,
      message: message.trim(),
      code,
      file: file.trim(),
      line: parseInt(lineStr, 10),
      column: parseInt(colStr, 10),
      logRange: { startLine: lineNumber, endLine: lineNumber },
    });

    return { lineNumber, diagnostic };
  }

  // Try project-level diagnostic (no line/column, e.g., file lock errors)
  const projectMatch = line.match(MSBUILD_PROJECT_ERROR_REGEX);
  if (projectMatch) {
    const [, file, severityStr, code, message] = projectMatch;
    const severity: Severity = severityStr === 'error' ? 'error' : 'warning';

    const diagnostic = createDiagnostic({
      tool,
      severity,
      message: message.trim(),
      code,
      file: file.trim(),
      logRange: { startLine: lineNumber, endLine: lineNumber },
    });

    return { lineNumber, diagnostic };
  }

  return { lineNumber, diagnostic: null };
}

export function parseBuildOutput(options: ParseOptions): Diagnostic[] {
  const { tool, output } = options;
  const lines = output.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const { diagnostic } = parseBuildLine(lines[i], i + 1, tool);
    if (diagnostic) {
      diagnostics.push(diagnostic);
    }
  }

  return deduplicateDiagnostics(diagnostics);
}

/**
 * Deduplicate diagnostics by code + file + normalized message.
 * This reduces noise from MSBuild retry warnings (MSB3026) which repeat
 * for each retry attempt with nearly identical messages.
 */
function deduplicateDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  const result: Diagnostic[] = [];

  for (const diag of diagnostics) {
    // Normalize message by removing retry count patterns like "retry 1", "retry 2"
    const normalizedMessage = diag.message
      .replace(/retry \d+ in \d+ms/gi, 'retry N')
      .replace(/retry count of \d+/gi, 'retry count of N');

    const key = `${diag.severity}:${diag.code}:${diag.file}:${normalizedMessage}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(diag);
    }
  }

  return result;
}
