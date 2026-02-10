import { describe, it, expect } from 'vitest';
import { parseEslintOutput } from '../../../src/plugins/eslint/parse-eslint.js';

describe('parseEslintOutput', () => {
  it('returns empty array for empty output', () => {
    const diagnostics = parseEslintOutput({ tool: 'eslint.lint', output: '' });

    expect(diagnostics).toEqual([]);
  });

  it('returns empty array for empty results array', () => {
    const output = '[]';
    const diagnostics = parseEslintOutput({ tool: 'eslint.lint', output });

    expect(diagnostics).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    const output = 'not valid json';
    const diagnostics = parseEslintOutput({ tool: 'eslint.lint', output });

    expect(diagnostics).toEqual([]);
  });

  it('parses single error', () => {
    const output = JSON.stringify([
      {
        filePath: '/src/utils.ts',
        messages: [
          {
            ruleId: 'no-unused-vars',
            severity: 2,
            message: "'foo' is defined but never used.",
            line: 10,
            column: 7,
          },
        ],
        errorCount: 1,
        warningCount: 0,
      },
    ]);
    const diagnostics = parseEslintOutput({ tool: 'eslint.lint', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].code).toBe('no-unused-vars');
    expect(diagnostics[0].message).toBe("'foo' is defined but never used.");
    expect(diagnostics[0].file).toBe('/src/utils.ts');
    expect(diagnostics[0].line).toBe(10);
    expect(diagnostics[0].column).toBe(7);
  });

  it('parses single warning', () => {
    const output = JSON.stringify([
      {
        filePath: '/src/index.ts',
        messages: [
          {
            ruleId: 'no-console',
            severity: 1,
            message: 'Unexpected console statement.',
            line: 25,
            column: 1,
          },
        ],
        errorCount: 0,
        warningCount: 1,
      },
    ]);
    const diagnostics = parseEslintOutput({ tool: 'eslint.lint', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('warning');
    expect(diagnostics[0].code).toBe('no-console');
  });

  it('parses multiple messages in single file', () => {
    const output = JSON.stringify([
      {
        filePath: '/src/utils.ts',
        messages: [
          { ruleId: 'no-unused-vars', severity: 2, message: 'Unused var', line: 1, column: 1 },
          { ruleId: 'no-console', severity: 1, message: 'No console', line: 2, column: 1 },
        ],
        errorCount: 1,
        warningCount: 1,
      },
    ]);
    const diagnostics = parseEslintOutput({ tool: 'eslint.lint', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[1].severity).toBe('warning');
  });

  it('parses multiple files', () => {
    const output = JSON.stringify([
      {
        filePath: '/src/a.ts',
        messages: [{ ruleId: 'rule-a', severity: 2, message: 'Error A', line: 1, column: 1 }],
        errorCount: 1,
        warningCount: 0,
      },
      {
        filePath: '/src/b.ts',
        messages: [{ ruleId: 'rule-b', severity: 2, message: 'Error B', line: 5, column: 3 }],
        errorCount: 1,
        warningCount: 0,
      },
    ]);
    const diagnostics = parseEslintOutput({ tool: 'eslint.lint', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].file).toBe('/src/a.ts');
    expect(diagnostics[1].file).toBe('/src/b.ts');
  });

  it('handles null ruleId', () => {
    const output = JSON.stringify([
      {
        filePath: '/src/file.ts',
        messages: [{ ruleId: null, severity: 2, message: 'Parse error', line: 1, column: 1 }],
        errorCount: 1,
        warningCount: 0,
      },
    ]);
    const diagnostics = parseEslintOutput({ tool: 'eslint.lint', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBeUndefined();
  });

  it('sets tool name correctly', () => {
    const output = JSON.stringify([
      {
        filePath: '/src/file.ts',
        messages: [{ ruleId: 'test', severity: 2, message: 'Test', line: 1, column: 1 }],
        errorCount: 1,
        warningCount: 0,
      },
    ]);
    const diagnostics = parseEslintOutput({ tool: 'eslint.lint', output });

    expect(diagnostics[0].tool).toBe('eslint.lint');
  });

  it('sets logRange to zero since diagnostics come from JSON', () => {
    const output = JSON.stringify([
      {
        filePath: '/src/file.ts',
        messages: [{ ruleId: 'test', severity: 2, message: 'Test', line: 1, column: 1 }],
        errorCount: 1,
        warningCount: 0,
      },
    ]);
    const diagnostics = parseEslintOutput({ tool: 'eslint.lint', output });

    expect(diagnostics[0].logRange.startLine).toBe(0);
    expect(diagnostics[0].logRange.endLine).toBe(0);
  });
});
