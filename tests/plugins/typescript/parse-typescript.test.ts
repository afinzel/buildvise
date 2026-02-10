/**
 * Tests for TypeScript output parser
 */

import { describe, it, expect } from 'vitest';
import { parseTypescriptOutput } from '../../../src/plugins/typescript/parse-typescript.js';

describe('parseTypescriptOutput', () => {
  it('returns empty array for clean output', () => {
    const output = `
Successfully compiled 10 files.
`;
    const diagnostics = parseTypescriptOutput({ tool: 'npm.build', output });
    expect(diagnostics).toEqual([]);
  });

  it('parses default format error', () => {
    const output = `src/foo.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.`;
    const diagnostics = parseTypescriptOutput({ tool: 'npm.build', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].code).toBe('TS2322');
    expect(diagnostics[0].file).toBe('src/foo.ts');
    expect(diagnostics[0].line).toBe(10);
    expect(diagnostics[0].column).toBe(5);
    expect(diagnostics[0].message).toBe(
      "Type 'string' is not assignable to type 'number'."
    );
  });

  it('parses pretty format error', () => {
    const output = `src/bar.ts:15:3 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`;
    const diagnostics = parseTypescriptOutput({ tool: 'npm.build', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].code).toBe('TS2345');
    expect(diagnostics[0].file).toBe('src/bar.ts');
    expect(diagnostics[0].line).toBe(15);
    expect(diagnostics[0].column).toBe(3);
  });

  it('parses multiple errors', () => {
    const output = `src/foo.ts(10,5): error TS2322: Type error 1
src/bar.ts(20,10): error TS2345: Type error 2
src/baz.ts:30:1 - error TS2339: Property error`;
    const diagnostics = parseTypescriptOutput({ tool: 'npm.build', output });

    expect(diagnostics).toHaveLength(3);
    expect(diagnostics[0].file).toBe('src/foo.ts');
    expect(diagnostics[1].file).toBe('src/bar.ts');
    expect(diagnostics[2].file).toBe('src/baz.ts');
  });

  it('parses warnings', () => {
    const output = `src/foo.ts(10,5): warning TS2322: Some warning message`;
    const diagnostics = parseTypescriptOutput({ tool: 'npm.build', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('warning');
  });

  it('assigns correct line numbers in log', () => {
    const output = `Line 1
src/foo.ts(10,5): error TS2322: Error on line 2
Line 3
src/bar.ts:15:3 - error TS2345: Error on line 4`;
    const diagnostics = parseTypescriptOutput({ tool: 'npm.build', output });

    expect(diagnostics[0].logRange.startLine).toBe(2);
    expect(diagnostics[1].logRange.startLine).toBe(4);
  });

  it('sets tool name correctly', () => {
    const output = `src/foo.ts(10,5): error TS2322: Some error`;
    const diagnostics = parseTypescriptOutput({ tool: 'npm.build', output });

    expect(diagnostics[0].tool).toBe('npm.build');
  });

  it('handles Windows-style paths', () => {
    const output = `C:\\Users\\dev\\src\\foo.ts(10,5): error TS2322: Type error`;
    const diagnostics = parseTypescriptOutput({ tool: 'npm.build', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].file).toBe('C:\\Users\\dev\\src\\foo.ts');
  });
});
