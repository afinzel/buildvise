/**
 * Reproduction test for GitHub Issue #1:
 * pnpm_test returns success: false with errors: [] when vitest tests fail.
 *
 * This test feeds real vitest failure output (from this project's own test runner)
 * through both the pnpm and npm test plugin pipelines and verifies that
 * diagnostics are now produced instead of an empty array.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pnpmTestPlugin } from '../../../src/plugins/pnpm/pnpm-test.js';
import { npmTestPlugin } from '../../../src/plugins/npm/npm-test.js';
import type { PluginInput } from '../../../src/plugins/types.js';
import type { RunWriter } from '../../../src/storage/index.js';

vi.mock('../../../src/plugins/executor.js', () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from '../../../src/plugins/executor.js';

const mockExecuteCommand = vi.mocked(executeCommand);

function createMockRunWriter(): RunWriter {
  return {
    runId: 'test-run-id',
    appendLog: vi.fn(),
    writeDiagnostics: vi.fn(),
    complete: vi.fn(),
  };
}

function createInput(cwd = '/test/project'): PluginInput {
  return {
    args: [],
    cwd,
    runWriter: createMockRunWriter(),
  };
}

// This is real vitest output captured from a failing test run (ANSI codes included)
const VITEST_FAILURE_OUTPUT = `
\x1b[36;1m RUN \x1b[39;22m v2.1.9 /Users/dev/my-project

 \x1b[32m✓\x1b[39m src/utils.test.ts \x1b[2m(5)\x1b[22m \x1b[2m4ms\x1b[22m
 \x1b[31m❯\x1b[39m src/math.test.ts \x1b[2m(3 tests | 2 failed)\x1b[22m \x1b[2m8ms\x1b[22m
   \x1b[32m✓\x1b[39m add > handles zero
   \x1b[31m×\x1b[39m add > returns correct sum
   \x1b[31m×\x1b[39m subtract > returns correct difference

\x1b[31;1m⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯\x1b[39;22m

 \x1b[31mFAIL\x1b[39m  src/math.test.ts > add > returns correct sum
\x1b[31mAssertionError: expected 5 to be 4 // Object.is equality\x1b[39m

- Expected
+ Received

-   4
+   5

 ❯ src/math.test.ts:10:18
      8|   it('returns correct sum', () => {
      9|     const result = add(2, 3);
     10|     expect(result).toBe(4);
       |                  ^
     11|   });
     12|

 \x1b[31mFAIL\x1b[39m  src/math.test.ts > subtract > returns correct difference
\x1b[31mAssertionError: expected -1 to be 1 // Object.is equality\x1b[39m

- Expected
+ Received

-   1
+   -1

 ❯ src/math.test.ts:20:18
     18|   it('returns correct difference', () => {
     19|     const result = subtract(2, 3);
     20|     expect(result).toBe(1);
       |                  ^
     21|   });
     22|

\x1b[31;1m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯\x1b[39;22m

 \x1b[31;1mTest Files\x1b[39;22m  1 failed | 1 passed (2)
      \x1b[31;1mTests\x1b[39;22m  2 failed | 6 passed (8)
   \x1b[2mStart at\x1b[22m  10:00:00
   \x1b[2mDuration\x1b[22m  1.23s
`;

describe('Issue #1 reproduction: vitest failures produce diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pnpm.test returns diagnostics for vitest failures (was empty before fix)', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      output: VITEST_FAILURE_OUTPUT,
    });

    const result = await pnpmTestPlugin.execute(createInput());

    // Before fix: result.diagnostics was [] (empty)
    // After fix: should contain 2 diagnostics
    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(2);

    // First failure: add > returns correct sum
    expect(result.diagnostics[0].severity).toBe('error');
    expect(result.diagnostics[0].message).toContain('add > returns correct sum');
    expect(result.diagnostics[0].message).toContain('Expected: 4');
    expect(result.diagnostics[0].message).toContain('Received: 5');
    expect(result.diagnostics[0].file).toBe('src/math.test.ts');
    expect(result.diagnostics[0].line).toBe(10);
    expect(result.diagnostics[0].column).toBe(18);
    expect(result.diagnostics[0].tool).toBe('pnpm.test');

    // Second failure: subtract > returns correct difference
    expect(result.diagnostics[1].message).toContain('subtract > returns correct difference');
    expect(result.diagnostics[1].message).toContain('Expected: 1');
    expect(result.diagnostics[1].message).toContain('Received: -1');
    expect(result.diagnostics[1].file).toBe('src/math.test.ts');
    expect(result.diagnostics[1].line).toBe(20);
  });

  it('npm.test returns diagnostics for vitest failures (was empty before fix)', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      output: VITEST_FAILURE_OUTPUT,
    });

    const result = await npmTestPlugin.execute(createInput());

    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics[0].tool).toBe('npm.test');
    expect(result.diagnostics[0].message).toContain('add > returns correct sum');
    expect(result.diagnostics[1].message).toContain('subtract > returns correct difference');
  });

  it('pnpm.test returns vitest summary (was undefined before fix)', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      output: VITEST_FAILURE_OUTPUT,
    });

    const result = await pnpmTestPlugin.execute(createInput());

    expect(result.summary).toBeDefined();
    expect(result.summary).toEqual({
      passed: 6,
      failed: 2,
      skipped: 0,
      total: 8,
    });
  });

  it('npm.test returns vitest summary (was undefined before fix)', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      output: VITEST_FAILURE_OUTPUT,
    });

    const result = await npmTestPlugin.execute(createInput());

    expect(result.summary).toBeDefined();
    expect(result.summary).toEqual({
      passed: 6,
      failed: 2,
      skipped: 0,
      total: 8,
    });
  });
});
