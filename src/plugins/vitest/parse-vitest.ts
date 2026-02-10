/**
 * Parser for Vitest test output
 */

import { createDiagnostic, type Diagnostic, type TestSummary } from '../../types/index.js';

// Strip ANSI escape codes
const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

// Matches "FAIL  filepath > describe > test" (double space after FAIL distinguishes from Jest)
const FAIL_TEST_REGEX = /^ FAIL\s+(.+?)(?:\s+>\s+(.+))$/;

// Matches "❯ filepath:line:col" stack trace
const STACK_TRACE_REGEX = /^\s*❯\s+(.+):(\d+):(\d+)\b/;

// Matches "AssertionError:" or "Error:" message lines
const ERROR_MESSAGE_REGEX = /^\s*(AssertionError|AssertError|Error|TypeError|ReferenceError):\s*(.+)$/;

// Matches "- Expected" header line
const EXPECTED_REGEX = /^\s*-\s+Expected\s*$/;

// Matches "+ Received" header line
const RECEIVED_REGEX = /^\s*\+\s+Received\s*$/;

// Matches expected value line (e.g., "-   200")
const EXPECTED_VALUE_REGEX = /^\s*-\s{3}(.+)$/;

// Matches received value line (e.g., "+   500")
const RECEIVED_VALUE_REGEX = /^\s*\+\s{3}(.+)$/;

// Matches the "Failed Tests" section header
const FAILED_TESTS_HEADER = /^ Failed Tests\s*(\d+)?/;

export interface ParseVitestOptions {
  tool: string;
  output: string;
}

interface PendingFailure {
  testName: string;
  testNameLine: number;
  file?: string;
  line?: number;
  column?: number;
  expected?: string;
  received?: string;
  errorMessage?: string;
}

export function parseVitestOutput(options: ParseVitestOptions): Diagnostic[] {
  const { tool, output } = options;
  const cleaned = output.replace(ANSI_REGEX, '');
  const lines = cleaned.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];

  let pending: PendingFailure | undefined;
  let inDiffBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Detect "Failed Tests" section (skip header line)
    if (FAILED_TESTS_HEADER.test(line)) {
      continue;
    }

    // "FAIL  filepath > describe > test" line
    const failMatch = line.match(FAIL_TEST_REGEX);
    if (failMatch) {
      // Emit previous pending failure
      if (pending) {
        diagnostics.push(createFailureDiagnostic(tool, pending));
      }

      const filePath = failMatch[1].trim();
      const testPath = failMatch[2]?.trim();

      pending = {
        testName: testPath ?? filePath,
        testNameLine: lineNumber,
        file: filePath,
      };
      inDiffBlock = false;
      continue;
    }

    if (!pending) continue;

    // Stack trace: ❯ filepath:line:col
    const stackMatch = line.match(STACK_TRACE_REGEX);
    if (stackMatch && !pending.line) {
      pending.file = stackMatch[1];
      pending.line = parseInt(stackMatch[2], 10);
      pending.column = parseInt(stackMatch[3], 10);
      continue;
    }

    // Error message
    const errorMatch = line.match(ERROR_MESSAGE_REGEX);
    if (errorMatch) {
      pending.errorMessage = errorMatch[2].trim();
      continue;
    }

    // "- Expected" header starts a diff block
    if (EXPECTED_REGEX.test(line)) {
      inDiffBlock = true;
      continue;
    }

    // "+ Received" header (part of diff block)
    if (RECEIVED_REGEX.test(line)) {
      continue;
    }

    // Inside diff block: capture expected/received value lines
    if (inDiffBlock) {
      const expectedValueMatch = line.match(EXPECTED_VALUE_REGEX);
      if (expectedValueMatch && !pending.expected) {
        pending.expected = expectedValueMatch[1].trim();
        continue;
      }

      const receivedValueMatch = line.match(RECEIVED_VALUE_REGEX);
      if (receivedValueMatch && !pending.received) {
        pending.received = receivedValueMatch[1].trim();
        inDiffBlock = false;
        continue;
      }
    }
  }

  // Emit final pending failure
  if (pending) {
    diagnostics.push(createFailureDiagnostic(tool, pending));
  }

  return diagnostics;
}

function createFailureDiagnostic(tool: string, failure: PendingFailure): Diagnostic {
  let message = failure.testName;

  if (failure.expected !== undefined && failure.received !== undefined) {
    message += ` - Expected: ${failure.expected}, Received: ${failure.received}`;
  } else if (failure.errorMessage) {
    message += ` - ${failure.errorMessage}`;
  }

  return createDiagnostic({
    tool,
    severity: 'error',
    message,
    file: failure.file,
    line: failure.line,
    column: failure.column,
    logRange: { startLine: failure.testNameLine, endLine: failure.testNameLine },
  });
}

// Matches vitest summary: "Tests  N failed | N passed (total)" or "Tests  N failed | N passed | N skipped (total)"
const VITEST_SUMMARY_REGEX = /^\s*Tests\s+(.+)\((\d+)\)\s*$/;

/**
 * Parse Vitest test summary from output
 */
export function parseVitestSummary(output: string): TestSummary | undefined {
  const cleaned = output.replace(ANSI_REGEX, '');
  const lines = cleaned.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(VITEST_SUMMARY_REGEX);
    if (match) {
      const summaryPart = match[1];
      const total = parseInt(match[2], 10);

      let failed = 0;
      let passed = 0;
      let skipped = 0;

      const failedMatch = summaryPart.match(/(\d+)\s+failed/);
      if (failedMatch) {
        failed = parseInt(failedMatch[1], 10);
      }

      const passedMatch = summaryPart.match(/(\d+)\s+passed/);
      if (passedMatch) {
        passed = parseInt(passedMatch[1], 10);
      }

      const skippedMatch = summaryPart.match(/(\d+)\s+(?:skipped|todo)/);
      if (skippedMatch) {
        skipped = parseInt(skippedMatch[1], 10);
      }

      return { passed, failed, skipped, total };
    }
  }

  return undefined;
}
