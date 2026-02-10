import { describe, it, expect } from 'vitest';
import { parseNpmOutput } from '../../../src/plugins/npm/parse-npm.js';

describe('parseNpmOutput', () => {
  it('returns empty array for clean install', () => {
    const output = `
added 50 packages in 2s
`;
    const diagnostics = parseNpmOutput({ tool: 'npm.install', output });

    expect(diagnostics).toEqual([]);
  });

  it('parses warning with code', () => {
    const output = `npm warn deprecated inflight@1.0.6: This module is not supported`;
    const diagnostics = parseNpmOutput({ tool: 'npm.install', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('warning');
    expect(diagnostics[0].code).toBe('deprecated');
    expect(diagnostics[0].message).toBe('inflight@1.0.6: This module is not supported');
  });

  it('parses warning without code', () => {
    const output = `npm warn some warning message`;
    const diagnostics = parseNpmOutput({ tool: 'npm.install', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('warning');
    expect(diagnostics[0].message).toContain('warning message');
  });

  it('parses error with code', () => {
    const output = `npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree`;
    const diagnostics = parseNpmOutput({ tool: 'npm.install', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].code).toBe('ERESOLVE');
    expect(diagnostics[1].severity).toBe('error');
    expect(diagnostics[1].message).toBe('unable to resolve dependency tree');
  });

  it('parses mixed warnings and errors', () => {
    const output = `
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated inflight@1.0.6: This module is not supported
npm error code ERESOLVE
npm error ERESOLVE could not resolve
`;
    const diagnostics = parseNpmOutput({ tool: 'npm.install', output });

    expect(diagnostics).toHaveLength(4);
    expect(diagnostics.filter(d => d.severity === 'warning')).toHaveLength(2);
    expect(diagnostics.filter(d => d.severity === 'error')).toHaveLength(2);
  });

  it('assigns correct line numbers', () => {
    const output = `Line 1
npm warn deprecated some-package: deprecated
Line 3
npm error ERESOLVE error message`;
    const diagnostics = parseNpmOutput({ tool: 'npm.install', output });

    expect(diagnostics[0].logRange.startLine).toBe(2);
    expect(diagnostics[1].logRange.startLine).toBe(4);
  });

  it('sets tool name correctly', () => {
    const output = `npm warn deprecated test: message`;
    const diagnostics = parseNpmOutput({ tool: 'npm.install', output });

    expect(diagnostics[0].tool).toBe('npm.install');
  });
});
