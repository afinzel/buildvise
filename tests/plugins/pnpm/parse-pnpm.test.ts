import { describe, it, expect } from 'vitest';
import { parsePnpmOutput } from '../../../src/plugins/pnpm/parse-pnpm.js';

describe('parsePnpmOutput', () => {
  it('returns empty array for clean install', () => {
    const output = `
Packages: +50
Progress: resolved 50, reused 50, downloaded 0, added 50, done
`;
    const diagnostics = parsePnpmOutput({ tool: 'pnpm.install', output });

    expect(diagnostics).toEqual([]);
  });

  it('parses warning with code', () => {
    const output = ` WARN  deprecated inflight@1.0.6: This module is not supported`;
    const diagnostics = parsePnpmOutput({ tool: 'pnpm.install', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('warning');
    expect(diagnostics[0].code).toBe('deprecated');
    expect(diagnostics[0].message).toBe('inflight@1.0.6: This module is not supported');
  });

  it('parses warning without code', () => {
    const output = ` WARN  some warning message here`;
    const diagnostics = parsePnpmOutput({ tool: 'pnpm.install', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('warning');
  });

  it('parses pnpm error', () => {
    const output = ` ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies`;
    const diagnostics = parsePnpmOutput({ tool: 'pnpm.install', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].code).toBe('PEER_DEP_ISSUES');
    expect(diagnostics[0].message).toBe('Unmet peer dependencies');
  });

  it('parses mixed warnings and errors', () => {
    const output = `
 WARN  deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
 WARN  deprecated inflight@1.0.6: This module is not supported
 ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies
`;
    const diagnostics = parsePnpmOutput({ tool: 'pnpm.install', output });

    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.filter(d => d.severity === 'warning')).toHaveLength(2);
    expect(diagnostics.filter(d => d.severity === 'error')).toHaveLength(1);
  });

  it('assigns correct line numbers', () => {
    const output = `Line 1
 WARN  deprecated some-package: deprecated
Line 3
 ERR_PNPM_TEST  error message`;
    const diagnostics = parsePnpmOutput({ tool: 'pnpm.install', output });

    expect(diagnostics[0].logRange.startLine).toBe(2);
    expect(diagnostics[1].logRange.startLine).toBe(4);
  });

  it('sets tool name correctly', () => {
    const output = ` WARN  deprecated test: message`;
    const diagnostics = parsePnpmOutput({ tool: 'pnpm.install', output });

    expect(diagnostics[0].tool).toBe('pnpm.install');
  });
});
