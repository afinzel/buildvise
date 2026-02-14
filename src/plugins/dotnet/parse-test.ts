/**
 * Parser for dotnet test output
 */

import { createDiagnostic, type Diagnostic, type TestSummary } from '../../types/index.js';
import type { ParseOptions } from '../parse-chain.js';
import { truncateLine } from '../../utils/validation.js';

const FAILED_TEST_REGEX = /^\s*Failed\s+(.+?)\s+\[/;
const STACK_TRACE_REGEX = /in\s+(.+?):line\s+(\d+)/;

interface TestFailure {
  testName: string;
  errorMessage: string;
  file?: string;
  line?: number;
  startLine: number;
  endLine: number;
}

export function parseTestOutput(options: ParseOptions): Diagnostic[] {
  const { tool, output } = options;
  const lines = output.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];
  const failures: TestFailure[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = truncateLine(lines[i]);
    const failedMatch = line.match(FAILED_TEST_REGEX);

    if (failedMatch) {
      const testName = failedMatch[1];
      const startLine = i + 1;
      let errorMessage = '';
      let file: string | undefined;
      let fileLine: number | undefined;
      let endLine = startLine;

      i++;
      while (i < lines.length) {
        const nextLine = truncateLine(lines[i]);

        if (nextLine.match(FAILED_TEST_REGEX) || nextLine.trim() === '') {
          if (nextLine.trim() === '') {
            i++;
          }
          break;
        }

        if (nextLine.includes('Error Message:')) {
          i++;
          if (i < lines.length) {
            errorMessage = lines[i].trim();
          }
        }

        const stackMatch = nextLine.match(STACK_TRACE_REGEX);
        if (stackMatch && !file) {
          file = stackMatch[1];
          fileLine = parseInt(stackMatch[2], 10);
        }

        endLine = i + 1;
        i++;
      }

      failures.push({
        testName,
        errorMessage: errorMessage || `Test ${testName} failed`,
        file,
        line: fileLine,
        startLine,
        endLine,
      });
    } else {
      i++;
    }
  }

  for (const failure of failures) {
    diagnostics.push(
      createDiagnostic({
        tool,
        severity: 'error',
        message: failure.errorMessage,
        code: 'TestFailure',
        file: failure.file,
        line: failure.line,
        logRange: { startLine: failure.startLine, endLine: failure.endLine },
      })
    );
  }

  return diagnostics;
}

/**
 * Parse dotnet test summary from output, aggregating results from all projects
 */
export function parseDotnetTestSummary(output: string): TestSummary | undefined {
  // Regex created inside function to avoid lastIndex state issues with global flag
  // Matches: Passed! - Failed: 0, Passed: 11, Skipped: 0, Total: 11
  // Also matches: Failed! - Failed: 2, Passed: 9, Skipped: 0, Total: 11
  const summaryRegex =
    /(?:Passed!|Failed!)\s*-\s*Failed:\s*(\d+),\s*Passed:\s*(\d+),\s*Skipped:\s*(\d+),\s*Total:\s*(\d+)/g;

  // Matches build errors in test projects: error CS0021: ... [/path/to/Something.Tests.csproj]
  const buildErrorRegex = /: error \w+\d+:.+\[(.+?\.Tests\.csproj)\]/g;

  const summaryMatches = output.matchAll(summaryRegex);
  const buildErrorMatches = output.matchAll(buildErrorRegex);

  let found = false;
  const summary: TestSummary = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };

  for (const match of summaryMatches) {
    found = true;
    summary.failed += parseInt(match[1], 10);
    summary.passed += parseInt(match[2], 10);
    summary.skipped += parseInt(match[3], 10);
    summary.total += parseInt(match[4], 10);
  }

  // Count unique test projects with build errors
  const projectsWithBuildErrors = new Set<string>();
  for (const match of buildErrorMatches) {
    projectsWithBuildErrors.add(match[1]);
  }

  if (projectsWithBuildErrors.size > 0) {
    found = true;
    summary.projectsBuildFailed = projectsWithBuildErrors.size;
  }

  return found ? summary : undefined;
}
