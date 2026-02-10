import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { createCli, parseArgs } from '../src/cli.js';
import { createPluginRegistry } from '../src/plugins/registry.js';
import { createStorage } from '../src/storage/storage.js';
import type { Plugin, PluginInput, PluginOutput } from '../src/plugins/types.js';

const TEST_DIR = '/tmp/buildvise-cli-test';

function createMockPlugin(name: string, opts?: { fail?: boolean; error?: boolean }): Plugin {
  return {
    name,
    description: `Mock plugin ${name}`,
    mutatesWorkspace: false,
    inputSchema: { type: 'object' },
    async execute(_input: PluginInput): Promise<PluginOutput> {
      if (opts?.error) {
        throw new Error('boom');
      }
      return {
        success: !opts?.fail,
        diagnostics: opts?.fail
          ? [{
              tool: name,
              severity: 'error' as const,
              message: 'build failed',
              code: 'E1',
              logRange: { startLine: 0, endLine: 0 },
              byteOffsets: { start: 0, end: 0 },
            }]
          : [],
        exitCode: opts?.fail ? 1 : 0,
      };
    },
  };
}

describe('parseArgs', () => {
  it('returns help for no args', () => {
    const result = parseArgs(['node', 'buildvise']);

    expect(result.kind).toBe('exit');
    if (result.kind === 'exit') {
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('Usage:');
    }
  });

  it('returns help for --help flag', () => {
    const result = parseArgs(['node', 'buildvise', '--help']);

    expect(result.kind).toBe('exit');
    if (result.kind === 'exit') {
      expect(result.exitCode).toBe(0);
    }
  });

  it('returns error for unknown command', () => {
    const result = parseArgs(['node', 'buildvise', 'unknown']);

    expect(result.kind).toBe('exit');
    if (result.kind === 'exit') {
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('Unknown command');
    }
  });

  it('parses exec command with tool name', () => {
    const result = parseArgs(['node', 'buildvise', 'exec', 'npm.build']);

    expect(result.kind).toBe('command');
    if (result.kind === 'command') {
      expect(result.command).toBe('exec');
      expect(result.args.tool).toBe('npm.build');
    }
  });

  it('parses exec command with --cwd', () => {
    const result = parseArgs(['node', 'buildvise', 'exec', 'npm.build', '--cwd', '/tmp']);

    expect(result.kind).toBe('command');
    if (result.kind === 'command') {
      expect(result.args.tool).toBe('npm.build');
      expect(result.args.cwd).toBe('/tmp');
    }
  });

  it('parses exec command with extra args after --', () => {
    const result = parseArgs(['node', 'buildvise', 'exec', 'npm.build', '--', '--production']);

    expect(result.kind).toBe('command');
    if (result.kind === 'command') {
      expect(result.args.tool).toBe('npm.build');
      expect(result.args.extraArgs).toEqual(['--production']);
    }
  });

  it('parses list command', () => {
    const result = parseArgs(['node', 'buildvise', 'list']);

    expect(result.kind).toBe('command');
    if (result.kind === 'command') {
      expect(result.command).toBe('list');
    }
  });

  it('parses raw command', () => {
    const result = parseArgs(['node', 'buildvise', 'raw', 'abc-123', '--offset', '10', '--length', '100']);

    expect(result.kind).toBe('command');
    if (result.kind === 'command') {
      expect(result.command).toBe('raw');
      expect(result.args.runId).toBe('abc-123');
      expect(result.args.offset).toBe(10);
      expect(result.args.length).toBe(100);
    }
  });

  it('parses log-range command', () => {
    const result = parseArgs(['node', 'buildvise', 'log-range', 'abc-123', '--start', '5', '--count', '20']);

    expect(result.kind).toBe('command');
    if (result.kind === 'command') {
      expect(result.command).toBe('log-range');
      expect(result.args.runId).toBe('abc-123');
      expect(result.args.startLine).toBe(5);
      expect(result.args.lineCount).toBe(20);
    }
  });
});

describe('createCli', () => {
  beforeEach(() => {
    process.env.XDG_DATA_HOME = TEST_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.XDG_DATA_HOME;
  });

  function setupCli(plugins: Plugin[] = []) {
    const registry = createPluginRegistry();
    for (const p of plugins) {
      registry.register(p);
    }
    const storage = createStorage();
    return createCli({ registry, storage, defaultCwd: '/tmp' });
  }

  describe('exec', () => {
    it('returns UNKNOWN_TOOL error for unregistered tool', async () => {
      const cli = setupCli();

      const result = await cli.exec('nonexistent', undefined, []);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]?.code).toBe('UNKNOWN_TOOL');
    });

    it('returns INVALID_CWD error for non-existent directory', async () => {
      const plugin = createMockPlugin('npm.build');
      const cli = setupCli([plugin]);

      const result = await cli.exec('npm.build', '/nonexistent/path', []);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]?.code).toBe('INVALID_CWD');
    });

    it('returns success response for successful execution', async () => {
      const plugin = createMockPlugin('npm.build');
      const cli = setupCli([plugin]);

      const result = await cli.exec('npm.build', '/tmp', []);

      expect(result.success).toBe(true);
      expect(result.runId).toBeTruthy();
    });

    it('returns error response for failed execution', async () => {
      const plugin = createMockPlugin('npm.build', { fail: true });
      const cli = setupCli([plugin]);

      const result = await cli.exec('npm.build', '/tmp', []);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.runId).toBeTruthy();
    });

    it('returns EXECUTION_ERROR when plugin throws', async () => {
      const plugin = createMockPlugin('npm.build', { error: true });
      const cli = setupCli([plugin]);

      const result = await cli.exec('npm.build', '/tmp', []);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]?.code).toBe('EXECUTION_ERROR');
      expect(result.errors?.[0]?.message).toContain('boom');
    });

    it('uses defaultCwd when cwd not provided', async () => {
      const plugin = createMockPlugin('npm.build');
      const cli = setupCli([plugin]);

      const result = await cli.exec('npm.build', undefined, []);

      expect(result.success).toBe(true);
    });
  });

  describe('list', () => {
    it('returns empty tools array when no plugins registered', () => {
      const cli = setupCli();

      const result = cli.list();

      expect(result.tools).toEqual([]);
    });

    it('returns all registered tools with name and description', () => {
      const p1 = createMockPlugin('npm.build');
      const p2 = createMockPlugin('npm.test');
      const cli = setupCli([p1, p2]);

      const result = cli.list();

      expect(result.tools).toHaveLength(2);
      expect(result.tools[0]).toEqual({ name: 'npm.build', description: 'Mock plugin npm.build' });
      expect(result.tools[1]).toEqual({ name: 'npm.test', description: 'Mock plugin npm.test' });
    });
  });

  describe('raw', () => {
    it('returns INVALID_RUN_ID for bad runId', () => {
      const cli = setupCli();

      const result = cli.raw('../etc/passwd') as { error: string; code: string };

      expect(result.code).toBe('INVALID_RUN_ID');
    });

    it('returns RUN_NOT_FOUND for non-existent run', () => {
      const cli = setupCli();

      const result = cli.raw('550e8400-e29b-41d4-a716-446655440000') as { error: string; code: string };

      expect(result.code).toBe('RUN_NOT_FOUND');
    });

    it('returns raw bytes from a run', async () => {
      const plugin = createMockPlugin('npm.build');
      const cli = setupCli([plugin]);

      const execResult = await cli.exec('npm.build', '/tmp', []);
      const result = cli.raw(execResult.runId) as { data: string; offset: number; totalBytes: number };

      expect(result.offset).toBe(0);
      expect(typeof result.totalBytes).toBe('number');
    });
  });

  describe('logRange', () => {
    it('returns INVALID_RUN_ID for bad runId', () => {
      const cli = setupCli();

      const result = cli.logRange('../etc/passwd', 1) as { error: string; code: string };

      expect(result.code).toBe('INVALID_RUN_ID');
    });

    it('returns RUN_NOT_FOUND for non-existent run', () => {
      const cli = setupCli();

      const result = cli.logRange('550e8400-e29b-41d4-a716-446655440000', 1) as { error: string; code: string };

      expect(result.code).toBe('RUN_NOT_FOUND');
    });

    it('returns INVALID_START_LINE for startLine < 1', async () => {
      const plugin = createMockPlugin('npm.build');
      const cli = setupCli([plugin]);

      const execResult = await cli.exec('npm.build', '/tmp', []);
      const result = cli.logRange(execResult.runId, 0) as { error: string; code: string };

      expect(result.code).toBe('INVALID_START_LINE');
    });

    it('returns empty lines when startLine exceeds totalLines', async () => {
      const plugin = createMockPlugin('npm.build');
      const cli = setupCli([plugin]);

      const execResult = await cli.exec('npm.build', '/tmp', []);
      const result = cli.logRange(execResult.runId, 9999) as { lines: string[]; hasMore: boolean };

      expect(result.lines).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });
});
