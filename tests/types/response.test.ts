import { describe, it, expect } from 'vitest';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../src/types/response.js';
import { createDiagnostic } from '../../src/types/diagnostic.js';

describe('createSuccessResponse', () => {
  it('creates minimal response with no warnings', () => {
    const response = createSuccessResponse('run-123');

    expect(response).toEqual({
      success: true,
      runId: 'run-123',
    });
    expect(response.errors).toBeUndefined();
    expect(response.warnings).toBeUndefined();
  });

  it('includes warnings when present', () => {
    const warning = createDiagnostic({
      tool: 'npm.install',
      severity: 'warning',
      message: 'Deprecated package',
      code: 'deprecated',
    });

    const response = createSuccessResponse('run-456', [warning]);

    expect(response.success).toBe(true);
    expect(response.warnings).toHaveLength(1);
    expect(response.warnings![0]).toEqual({
      message: 'Deprecated package',
      code: 'deprecated',
    });
  });
});

describe('createErrorResponse', () => {
  it('creates response with simplified errors', () => {
    const error = createDiagnostic({
      tool: 'dotnet.build',
      severity: 'error',
      message: 'Compilation failed',
      file: 'src/foo.cs',
      line: 10,
      column: 5,
      code: 'CS0103',
    });

    const response = createErrorResponse('run-789', [error]);

    expect(response.success).toBe(false);
    expect(response.runId).toBe('run-789');
    expect(response.errors).toHaveLength(1);
    expect(response.errors![0]).toEqual({
      message: 'Compilation failed',
      file: 'src/foo.cs',
      line: 10,
      column: 5,
      code: 'CS0103',
    });
    expect(response.warnings).toBeUndefined();
  });

  it('includes warnings when present', () => {
    const error = createDiagnostic({
      tool: 'dotnet.build',
      severity: 'error',
      message: 'Compilation failed',
    });
    const warning = createDiagnostic({
      tool: 'dotnet.build',
      severity: 'warning',
      message: 'Unused variable',
    });

    const response = createErrorResponse('run-abc', [error], [warning]);

    expect(response.success).toBe(false);
    expect(response.errors).toHaveLength(1);
    expect(response.warnings).toHaveLength(1);
  });

  it('omits undefined fields from simplified diagnostics', () => {
    const error = createDiagnostic({
      tool: 'npm.build',
      severity: 'error',
      message: 'Build failed',
    });

    const response = createErrorResponse('run-xyz', [error]);

    expect(response.errors![0]).toEqual({ message: 'Build failed' });
    expect(response.errors![0]).not.toHaveProperty('file');
    expect(response.errors![0]).not.toHaveProperty('line');
    expect(response.errors![0]).not.toHaveProperty('code');
  });

  it('includes summary when provided', () => {
    const error = createDiagnostic({
      tool: 'npm.test',
      severity: 'error',
      message: 'Test failed',
    });
    const summary = { passed: 9, failed: 1, skipped: 0, total: 10 };

    const response = createErrorResponse('run-sum', [error], [], { summary });

    expect(response.summary).toEqual(summary);
  });

  it('omits summary when not provided', () => {
    const error = createDiagnostic({
      tool: 'npm.test',
      severity: 'error',
      message: 'Test failed',
    });

    const response = createErrorResponse('run-no-sum', [error]);

    expect(response.summary).toBeUndefined();
  });
});

describe('createSuccessResponse with summary', () => {
  it('includes summary when provided', () => {
    const summary = { passed: 11, failed: 0, skipped: 0, total: 11 };

    const response = createSuccessResponse('run-sum', [], { summary });

    expect(response.success).toBe(true);
    expect(response.summary).toEqual(summary);
  });

  it('omits summary when not provided', () => {
    const response = createSuccessResponse('run-no-sum');

    expect(response.summary).toBeUndefined();
  });
});
