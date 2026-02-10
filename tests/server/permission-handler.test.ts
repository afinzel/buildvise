import { describe, it, expect } from 'vitest';
import { checkPermission } from '../../src/server/permission-handler.js';
import type { Plugin, PluginInput, PluginOutput } from '../../src/plugins/index.js';

function createMockPlugin(name: string, mutates: boolean): Plugin {
  return {
    name,
    description: `Mock plugin ${name}`,
    mutatesWorkspace: mutates,
    inputSchema: { type: 'object' },
    async execute(_input: PluginInput): Promise<PluginOutput> {
      return { success: true, diagnostics: [], exitCode: 0 };
    },
  };
}

describe('checkPermission', () => {
  it('allows non-mutating plugin without confirmation', () => {
    const plugin = createMockPlugin('dotnet.build', false);

    const result = checkPermission({
      plugin,
      args: [],
      cwd: '/project',
    });

    expect(result.allowed).toBe(true);
    expect(result.confirmationRequest).toBeUndefined();
  });

  it('allows non-mutating plugin even with confirmed=false', () => {
    const plugin = createMockPlugin('eslint.lint', false);

    const result = checkPermission({
      plugin,
      args: ['src/'],
      cwd: '/project',
      confirmed: false,
    });

    expect(result.allowed).toBe(true);
  });

  it('requires confirmation for mutating plugin', () => {
    const plugin = createMockPlugin('npm.install', true);

    const result = checkPermission({
      plugin,
      args: ['typescript'],
      cwd: '/project',
    });

    expect(result.allowed).toBe(false);
    expect(result.confirmationRequest).toBeDefined();
    expect(result.confirmationRequest!.confirmationRequired).toBe(true);
    expect(result.confirmationRequest!.tool).toBe('npm.install');
    expect(result.confirmationRequest!.args).toEqual(['typescript']);
    expect(result.confirmationRequest!.cwd).toBe('/project');
  });

  it('allows mutating plugin when confirmed', () => {
    const plugin = createMockPlugin('pnpm.install', true);

    const result = checkPermission({
      plugin,
      args: ['lodash'],
      cwd: '/app',
      confirmed: true,
    });

    expect(result.allowed).toBe(true);
    expect(result.confirmationRequest).toBeUndefined();
  });

  it('includes description in confirmation request', () => {
    const plugin = createMockPlugin('bun.install', true);

    const result = checkPermission({
      plugin,
      args: [],
      cwd: '/project',
    });

    expect(result.confirmationRequest!.description).toBe('Mock plugin bun.install');
  });
});
