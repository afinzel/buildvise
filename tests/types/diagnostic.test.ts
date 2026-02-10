import { describe, it, expect } from 'vitest';
import { createDiagnostic, type Diagnostic } from '../../src/types/diagnostic.js';

describe('createDiagnostic', () => {
  it('creates diagnostic with default log references', () => {
    const diagnostic = createDiagnostic({
      tool: 'dotnet.build',
      severity: 'error',
      message: 'Variable not found',
    });

    expect(diagnostic.logRange).toEqual({ startLine: 0, endLine: 0 });
    expect(diagnostic.byteOffsets).toEqual({ start: 0, end: 0 });
  });

  it('preserves provided log range values', () => {
    const diagnostic = createDiagnostic({
      tool: 'dotnet.build',
      severity: 'error',
      message: 'Variable not found',
      logRange: { startLine: 10, endLine: 15 },
    });

    expect(diagnostic.logRange).toEqual({ startLine: 10, endLine: 15 });
  });

  it('preserves provided byte offset values', () => {
    const diagnostic = createDiagnostic({
      tool: 'dotnet.build',
      severity: 'error',
      message: 'Variable not found',
      byteOffsets: { start: 100, end: 200 },
    });

    expect(diagnostic.byteOffsets).toEqual({ start: 100, end: 200 });
  });

  it('allows partial log range', () => {
    const diagnostic = createDiagnostic({
      tool: 'dotnet.build',
      severity: 'warning',
      message: 'Unused variable',
      logRange: { startLine: 5 },
    });

    expect(diagnostic.logRange).toEqual({ startLine: 5, endLine: 0 });
  });

  it('includes all optional fields when provided', () => {
    const diagnostic = createDiagnostic({
      tool: 'eslint.lint',
      severity: 'error',
      message: 'Unexpected console statement',
      code: 'no-console',
      file: 'src/index.ts',
      line: 42,
      column: 5,
    });

    expect(diagnostic).toMatchObject({
      tool: 'eslint.lint',
      severity: 'error',
      message: 'Unexpected console statement',
      code: 'no-console',
      file: 'src/index.ts',
      line: 42,
      column: 5,
    });
  });
});
