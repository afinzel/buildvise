/**
 * Tests for parse chain utility
 */

import { describe, it, expect } from 'vitest';
import { chainParsers } from '../../src/plugins/parse-chain.js';
import { createDiagnostic } from '../../src/types/index.js';

describe('chainParsers', () => {
  it('returns empty array when no parsers match', () => {
    const parser1 = () => [];
    const parser2 = () => [];

    const diagnostics = chainParsers([parser1, parser2], {
      tool: 'test',
      output: 'some output',
    });

    expect(diagnostics).toEqual([]);
  });

  it('combines results from multiple parsers', () => {
    const parser1 = ({ tool }: { tool: string }) => [
      createDiagnostic({
        tool,
        severity: 'error',
        message: 'Error from parser 1',
        logRange: { startLine: 1, endLine: 1 },
      }),
    ];
    const parser2 = ({ tool }: { tool: string }) => [
      createDiagnostic({
        tool,
        severity: 'warning',
        message: 'Warning from parser 2',
        logRange: { startLine: 2, endLine: 2 },
      }),
    ];

    const diagnostics = chainParsers([parser1, parser2], {
      tool: 'test',
      output: 'some output',
    });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].message).toBe('Error from parser 1');
    expect(diagnostics[1].message).toBe('Warning from parser 2');
  });

  it('deduplicates diagnostics at same location', () => {
    const diagnostic = createDiagnostic({
      tool: 'test',
      severity: 'error',
      message: 'Same error',
      file: 'foo.ts',
      line: 10,
      column: 5,
      logRange: { startLine: 1, endLine: 1 },
    });

    const parser1 = () => [diagnostic];
    const parser2 = () => [diagnostic];

    const diagnostics = chainParsers([parser1, parser2], {
      tool: 'test',
      output: 'some output',
    });

    expect(diagnostics).toHaveLength(1);
  });

  it('does not deduplicate different messages at same location', () => {
    const parser1 = ({ tool }: { tool: string }) => [
      createDiagnostic({
        tool,
        severity: 'error',
        message: 'Error 1',
        file: 'foo.ts',
        line: 10,
        column: 5,
        logRange: { startLine: 1, endLine: 1 },
      }),
    ];
    const parser2 = ({ tool }: { tool: string }) => [
      createDiagnostic({
        tool,
        severity: 'error',
        message: 'Error 2',
        file: 'foo.ts',
        line: 10,
        column: 5,
        logRange: { startLine: 1, endLine: 1 },
      }),
    ];

    const diagnostics = chainParsers([parser1, parser2], {
      tool: 'test',
      output: 'some output',
    });

    expect(diagnostics).toHaveLength(2);
  });

  it('passes tool and output to each parser', () => {
    let receivedOptions: { tool: string; output: string } | null = null;
    const parser = (options: { tool: string; output: string }) => {
      receivedOptions = options;
      return [];
    };

    chainParsers([parser], { tool: 'my-tool', output: 'my output' });

    expect(receivedOptions).toEqual({ tool: 'my-tool', output: 'my output' });
  });
});
