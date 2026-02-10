/**
 * Tests for Jest output parser
 */

import { describe, it, expect } from 'vitest';
import { parseJestOutput, parseJestSummary } from '../../../src/plugins/jest/parse-jest.js';

describe('parseJestOutput', () => {
  it('returns empty array for clean output', () => {
    const output = `
PASS __tests__/foo.test.ts
  describe block
    ✓ test passes (5 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });
    expect(diagnostics).toEqual([]);
  });

  it('parses single failed test', () => {
    const output = `
FAIL __tests__/foo.test.ts
  describe block
    ✕ should do something (10 ms)

  ● describe block › should do something

    expect(received).toBe(expected)

    Expected: 200
    Received: 500

      at Object.<anonymous> (__tests__/foo.test.ts:15:10)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].file).toBe('__tests__/foo.test.ts');
    expect(diagnostics[0].line).toBe(15);
    expect(diagnostics[0].column).toBe(10);
    expect(diagnostics[0].message).toContain('describe block › should do something');
    expect(diagnostics[0].message).toContain('Expected: 200');
    expect(diagnostics[0].message).toContain('Received: 500');
  });

  it('parses multiple failed tests in same file', () => {
    const output = `
FAIL __tests__/foo.test.ts
  ● test one

    Error: failure 1

      at Object.<anonymous> (__tests__/foo.test.ts:10:5)

  ● test two

    Error: failure 2

      at Object.<anonymous> (__tests__/foo.test.ts:20:5)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].message).toContain('test one');
    expect(diagnostics[0].line).toBe(10);
    expect(diagnostics[1].message).toContain('test two');
    expect(diagnostics[1].line).toBe(20);
  });

  it('parses multiple failed files', () => {
    const output = `
FAIL __tests__/a.test.ts
  ● test in a

    Error: a failed

      at Object.<anonymous> (__tests__/a.test.ts:5:1)

FAIL __tests__/b.test.ts
  ● test in b

    Error: b failed

      at Object.<anonymous> (__tests__/b.test.ts:10:1)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].file).toBe('__tests__/a.test.ts');
    expect(diagnostics[1].file).toBe('__tests__/b.test.ts');
  });

  it('handles nested describe blocks', () => {
    const output = `
FAIL __tests__/nested.test.ts
  ● outer › inner › deeply nested test

    Expected: true
    Received: false

      at Object.<anonymous> (__tests__/nested.test.ts:25:10)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('outer › inner › deeply nested test');
  });

  it('falls back to FAIL file when stack trace missing', () => {
    const output = `
FAIL __tests__/fallback.test.ts
  ● test without stack trace

    Some error occurred
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].file).toBe('__tests__/fallback.test.ts');
    expect(diagnostics[0].line).toBeUndefined();
  });

  it('captures assertion type', () => {
    const output = `
FAIL __tests__/assert.test.ts
  ● assertion test

    expect(received).toEqual(expected)

      at Object.<anonymous> (__tests__/assert.test.ts:5:1)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('expect(received).toEqual(expected)');
  });

  it('sets tool name correctly', () => {
    const output = `
FAIL __tests__/tool.test.ts
  ● test

    Error

      at Object.<anonymous> (__tests__/tool.test.ts:1:1)
`;
    const diagnostics = parseJestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics[0].tool).toBe('pnpm.test');
  });

  it('assigns correct log line numbers', () => {
    const output = `line 1
line 2
FAIL __tests__/log.test.ts
line 4
line 5
  ● test name

    Error

      at Object.<anonymous> (__tests__/log.test.ts:1:1)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    // ● is on line 6 (line 1-5 are: line 1, line 2, FAIL, line 4, line 5)
    expect(diagnostics[0].logRange.startLine).toBe(6);
  });
});

describe('parseJestSummary', () => {
  it('returns undefined for output without summary', () => {
    const output = `
PASS __tests__/foo.test.ts
  some test output
`;
    const summary = parseJestSummary(output);
    expect(summary).toBeUndefined();
  });

  it('parses all passed tests', () => {
    const output = `
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        1.5 s
`;
    const summary = parseJestSummary(output);

    expect(summary).toEqual({
      passed: 5,
      failed: 0,
      skipped: 0,
      total: 5,
    });
  });

  it('parses mixed results', () => {
    const output = `
Test Suites: 1 failed, 2 passed, 3 total
Tests:       3 failed, 45 passed, 2 skipped, 50 total
Snapshots:   0 total
Time:        2.5 s
`;
    const summary = parseJestSummary(output);

    expect(summary).toEqual({
      passed: 45,
      failed: 3,
      skipped: 2,
      total: 50,
    });
  });

  it('parses todo tests as skipped', () => {
    const output = `
Tests:       1 failed, 8 passed, 1 todo, 10 total
`;
    const summary = parseJestSummary(output);

    expect(summary).toEqual({
      passed: 8,
      failed: 1,
      skipped: 1,
      total: 10,
    });
  });

  it('handles only failed tests', () => {
    const output = `
Tests:       5 failed, 5 total
`;
    const summary = parseJestSummary(output);

    expect(summary).toEqual({
      passed: 0,
      failed: 5,
      skipped: 0,
      total: 5,
    });
  });

  it('handles only skipped tests', () => {
    const output = `
Tests:       3 skipped, 3 total
`;
    const summary = parseJestSummary(output);

    expect(summary).toEqual({
      passed: 0,
      failed: 0,
      skipped: 3,
      total: 3,
    });
  });

  it('aggregates results from multiple projects', () => {
    const output = `
PASS packages/core/__tests__/core.test.ts
Tests:       10 passed, 10 total

PASS packages/utils/__tests__/utils.test.ts
Tests:       1 failed, 5 passed, 6 total

FAIL packages/api/__tests__/api.test.ts
Tests:       2 failed, 8 passed, 2 skipped, 12 total
`;
    const summary = parseJestSummary(output);

    expect(summary).toEqual({
      passed: 23,
      failed: 3,
      skipped: 2,
      total: 28,
    });
  });
});
