/**
 * Parser for Jest test output
 */

import { createDiagnostic, type Diagnostic, type TestSummary } from '../../types/index.js';

// Matches FAIL filepath
const FAIL_REGEX = /^FAIL\s+(.+)$/;

// Matches ● describe › test name
const TEST_NAME_REGEX = /^\s*●\s+(.+)$/;

// Matches stack trace: at ... (file:line:col)
const STACK_TRACE_REGEX = /^\s+at\s+.+\((.+):(\d+):(\d+)\)$/;

// Matches expect assertion header
const EXPECT_REGEX = /^\s+(expect\(.+\)\..+)$/;

// Matches Expected/Received lines
const EXPECTED_REGEX = /^\s+Expected:\s*(.+)$/;
const RECEIVED_REGEX = /^\s+Received:\s*(.+)$/;

export interface ParseJestOptions {
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
  assertionType?: string;
}

export function parseJestOutput(options: ParseJestOptions): Diagnostic[] {
  const { tool, output } = options;
  const lines = output.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];

  let currentFile: string | undefined;
  let pending: PendingFailure | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Track current failing file
    const failMatch = line.match(FAIL_REGEX);
    if (failMatch) {
      currentFile = failMatch[1].trim();
      continue;
    }

    // Start of a test failure block
    const testNameMatch = line.match(TEST_NAME_REGEX);
    if (testNameMatch) {
      // Emit previous pending failure
      if (pending) {
        diagnostics.push(createFailureDiagnostic(tool, pending, currentFile));
      }
      pending = {
        testName: testNameMatch[1].trim(),
        testNameLine: lineNumber,
      };
      continue;
    }

    if (pending) {
      // Capture assertion type (expect...)
      const expectMatch = line.match(EXPECT_REGEX);
      if (expectMatch) {
        pending.assertionType = expectMatch[1].trim();
        continue;
      }

      // Capture expected value
      const expectedMatch = line.match(EXPECTED_REGEX);
      if (expectedMatch) {
        pending.expected = expectedMatch[1].trim();
        continue;
      }

      // Capture received value
      const receivedMatch = line.match(RECEIVED_REGEX);
      if (receivedMatch) {
        pending.received = receivedMatch[1].trim();
        continue;
      }

      // Capture stack trace location (first one is usually the test file)
      const stackMatch = line.match(STACK_TRACE_REGEX);
      if (stackMatch && !pending.file) {
        pending.file = stackMatch[1];
        pending.line = parseInt(stackMatch[2], 10);
        pending.column = parseInt(stackMatch[3], 10);
      }
    }
  }

  // Emit final pending failure
  if (pending) {
    diagnostics.push(createFailureDiagnostic(tool, pending, currentFile));
  }

  return diagnostics;
}

function createFailureDiagnostic(
  tool: string,
  failure: PendingFailure,
  fallbackFile?: string
): Diagnostic {
  let message = failure.testName;

  if (failure.expected !== undefined && failure.received !== undefined) {
    message += ` - Expected: ${failure.expected}, Received: ${failure.received}`;
  } else if (failure.assertionType) {
    message += ` - ${failure.assertionType}`;
  }

  return createDiagnostic({
    tool,
    severity: 'error',
    message,
    file: failure.file ?? fallbackFile,
    line: failure.line,
    column: failure.column,
    logRange: { startLine: failure.testNameLine, endLine: failure.testNameLine },
  });
}

// Matches Jest summary line: Tests: 3 failed, 45 passed, 2 skipped, 50 total
const JEST_SUMMARY_REGEX = /^Tests:\s+(.+)$/;

/**
 * Parse Jest test summary from output, aggregating results from all projects
 */
export function parseJestSummary(output: string): TestSummary | undefined {
  const lines = output.split(/\r?\n/);
  let found = false;
  const summary: TestSummary = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };

  for (const line of lines) {
    const match = line.match(JEST_SUMMARY_REGEX);
    if (match) {
      found = true;
      const summaryPart = match[1];

      // Parse each component: "3 failed", "45 passed", "2 skipped", "50 total"
      const failedMatch = summaryPart.match(/(\d+)\s+failed/);
      if (failedMatch) {
        summary.failed += parseInt(failedMatch[1], 10);
      }

      const passedMatch = summaryPart.match(/(\d+)\s+passed/);
      if (passedMatch) {
        summary.passed += parseInt(passedMatch[1], 10);
      }

      const skippedMatch = summaryPart.match(/(\d+)\s+(?:skipped|todo)/);
      if (skippedMatch) {
        summary.skipped += parseInt(skippedMatch[1], 10);
      }

      const totalMatch = summaryPart.match(/(\d+)\s+total/);
      if (totalMatch) {
        summary.total += parseInt(totalMatch[1], 10);
      }
    }
  }

  return found ? summary : undefined;
}
