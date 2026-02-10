/**
 * Tests for Vitest output parser
 */

import { describe, it, expect } from 'vitest';
import { parseVitestOutput, parseVitestSummary } from '../../../src/plugins/vitest/parse-vitest.js';

describe('parseVitestOutput', () => {
  it('returns empty array for clean output', () => {
    const output = `
 ✓ src/utils.test.ts (3)
 ✓ src/index.test.ts (5)

 Test Files  2 passed (2)
      Tests  8 passed (8)
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });
    expect(diagnostics).toEqual([]);
  });

  it('parses single failed test', () => {
    const output = `
 ❯ src/utils.test.ts (3)
   ❯ describe block (3)
     ✓ test passes
     ✕ should do something

 FAIL  src/utils.test.ts > describe block > should do something
AssertionError: expected 500 to be 200 // Object.is equality

- Expected
+ Received

-   200
+   500

 ❯ src/utils.test.ts:15:10
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].file).toBe('src/utils.test.ts');
    expect(diagnostics[0].line).toBe(15);
    expect(diagnostics[0].column).toBe(10);
    expect(diagnostics[0].message).toContain('describe block > should do something');
    expect(diagnostics[0].message).toContain('Expected: 200');
    expect(diagnostics[0].message).toContain('Received: 500');
  });

  it('parses multiple failed tests in same file', () => {
    const output = `
 FAIL  src/math.test.ts > add > returns sum
Error: expected 3 to be 4

 ❯ src/math.test.ts:10:5

 FAIL  src/math.test.ts > subtract > returns difference
Error: expected 1 to be 2

 ❯ src/math.test.ts:20:5
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].message).toContain('add > returns sum');
    expect(diagnostics[0].line).toBe(10);
    expect(diagnostics[1].message).toContain('subtract > returns difference');
    expect(diagnostics[1].line).toBe(20);
  });

  it('parses multiple failed files', () => {
    const output = `
 FAIL  src/a.test.ts > test in a
Error: a failed

 ❯ src/a.test.ts:5:1

 FAIL  src/b.test.ts > test in b
Error: b failed

 ❯ src/b.test.ts:10:1
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].file).toBe('src/a.test.ts');
    expect(diagnostics[1].file).toBe('src/b.test.ts');
  });

  it('handles nested describes', () => {
    const output = `
 FAIL  src/nested.test.ts > outer > inner > deeply nested test
AssertionError: expected true to be false

 ❯ src/nested.test.ts:25:10
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('outer > inner > deeply nested test');
  });

  it('falls back to FAIL file when stack trace missing', () => {
    const output = `
 FAIL  src/fallback.test.ts > test without stack trace
Some error occurred
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].file).toBe('src/fallback.test.ts');
    expect(diagnostics[0].line).toBeUndefined();
  });

  it('captures error message', () => {
    const output = `
 FAIL  src/err.test.ts > error test
TypeError: Cannot read properties of undefined

 ❯ src/err.test.ts:5:1
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('Cannot read properties of undefined');
  });

  it('captures expected/received diff', () => {
    const output = `
 FAIL  src/diff.test.ts > diff test
AssertionError: expected 'hello' to be 'world'

- Expected
+ Received

-   "world"
+   "hello"

 ❯ src/diff.test.ts:8:3
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('Expected: "world"');
    expect(diagnostics[0].message).toContain('Received: "hello"');
  });

  it('sets tool name correctly', () => {
    const output = `
 FAIL  src/tool.test.ts > test
Error: failed

 ❯ src/tool.test.ts:1:1
`;
    const diagnostics = parseVitestOutput({ tool: 'npm.test', output });

    expect(diagnostics[0].tool).toBe('npm.test');
  });

  it('assigns correct log line numbers', () => {
    const output = `line 1
line 2
line 3
 FAIL  src/log.test.ts > test name
Error: failed

 ❯ src/log.test.ts:1:1
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });

    // FAIL line is on line 4
    expect(diagnostics[0].logRange.startLine).toBe(4);
  });

  it('strips ANSI escape codes', () => {
    const output = `
\x1b[31m FAIL\x1b[39m  \x1b[36msrc/ansi.test.ts\x1b[39m > \x1b[1mtest with colors\x1b[22m
\x1b[31mError: colorful failure\x1b[39m

 ❯ src/ansi.test.ts:5:1
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].file).toBe('src/ansi.test.ts');
    expect(diagnostics[0].message).toContain('test with colors');
  });

  it('handles Failed Tests section header', () => {
    const output = `
 Failed Tests 2

 FAIL  src/a.test.ts > test a
Error: a failed

 ❯ src/a.test.ts:5:1

 FAIL  src/b.test.ts > test b
Error: b failed

 ❯ src/b.test.ts:10:1
`;
    const diagnostics = parseVitestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics).toHaveLength(2);
  });
});

describe('parseVitestSummary', () => {
  it('returns undefined for output without summary', () => {
    const output = `
 ✓ src/foo.test.ts (3)
  some test output
`;
    const summary = parseVitestSummary(output);
    expect(summary).toBeUndefined();
  });

  it('parses all passed tests', () => {
    const output = `
 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  10:00:00
   Duration  1.5s
`;
    const summary = parseVitestSummary(output);

    expect(summary).toEqual({
      passed: 5,
      failed: 0,
      skipped: 0,
      total: 5,
    });
  });

  it('parses mixed results', () => {
    const output = `
 Test Files  1 failed | 2 passed (3)
      Tests  3 failed | 45 passed | 2 skipped (50)
   Start at  10:00:00
   Duration  2.5s
`;
    const summary = parseVitestSummary(output);

    expect(summary).toEqual({
      passed: 45,
      failed: 3,
      skipped: 2,
      total: 50,
    });
  });

  it('parses todo as skipped', () => {
    const output = `
      Tests  1 failed | 8 passed | 1 todo (10)
`;
    const summary = parseVitestSummary(output);

    expect(summary).toEqual({
      passed: 8,
      failed: 1,
      skipped: 1,
      total: 10,
    });
  });

  it('handles only failed tests', () => {
    const output = `
      Tests  5 failed (5)
`;
    const summary = parseVitestSummary(output);

    expect(summary).toEqual({
      passed: 0,
      failed: 5,
      skipped: 0,
      total: 5,
    });
  });

  it('handles only skipped tests', () => {
    const output = `
      Tests  3 skipped (3)
`;
    const summary = parseVitestSummary(output);

    expect(summary).toEqual({
      passed: 0,
      failed: 0,
      skipped: 3,
      total: 3,
    });
  });

  it('strips ANSI codes before parsing', () => {
    const output = `
      \x1b[31mTests\x1b[39m  \x1b[31m3 failed\x1b[39m | \x1b[32m45 passed\x1b[39m (48)
`;
    const summary = parseVitestSummary(output);

    expect(summary).toEqual({
      passed: 45,
      failed: 3,
      skipped: 0,
      total: 48,
    });
  });
});
