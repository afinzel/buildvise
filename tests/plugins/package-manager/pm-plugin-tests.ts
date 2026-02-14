/**
 * Shared test factory for package manager plugins (npm/pnpm)
 *
 * Build, test, and run plugins across npm and pnpm share identical test
 * structure — only the plugin instance, command name, and sample error
 * output differ. This factory eliminates that duplication.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Plugin, PluginInput } from '../../../src/plugins/types.js';
import type { RunWriter } from '../../../src/storage/index.js';
import type { Mock } from 'vitest';

function createMockRunWriter(): RunWriter {
  return {
    runId: 'test-run-id',
    appendLog: vi.fn(),
    writeDiagnostics: vi.fn(),
    complete: vi.fn(),
  };
}

function createInput(args: string[] = [], cwd = '/test/project'): PluginInput {
  return {
    args,
    cwd,
    runWriter: createMockRunWriter(),
  };
}

interface BuildTestConfig {
  plugin: Plugin;
  packageManager: string;
  action: 'build' | 'test';
  description: string;
  errorOutput: string;
  mockExecuteCommand: Mock;
}

interface RunTestConfig {
  plugin: Plugin;
  packageManager: string;
  description: string;
  errorOutput: string;
  failureOutput: string;
  mockExecuteCommand: Mock;
}

export function describeBuildOrTestPlugin(config: BuildTestConfig): void {
  const { plugin, packageManager, action, description, errorOutput, mockExecuteCommand } = config;

  describe(`${packageManager}.${action} plugin`, () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('has correct metadata', () => {
      expect(plugin.name).toBe(`${packageManager}.${action}`);
      expect(plugin.description).toBe(description);
      expect(plugin.mutatesWorkspace).toBe(false);
    });

    it(`executes ${packageManager} run ${action}`, async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 0, output: '' });

      const input = createInput();
      await plugin.execute(input);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        command: packageManager,
        args: ['run', action],
        cwd: '/test/project',
        runWriter: input.runWriter,
      });
    });

    it('passes additional args after -- separator', async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 0, output: '' });

      const extraArgs = action === 'build'
        ? ['--production', '--minify']
        : ['--coverage', '--watch'];
      const input = createInput(extraArgs);
      await plugin.execute(input);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        command: packageManager,
        args: ['run', action, '--', ...extraArgs],
        cwd: '/test/project',
        runWriter: input.runWriter,
      });
    });

    it('returns success when exit code is 0', async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 0, output: 'Success' });

      const result = await plugin.execute(createInput());

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('returns failure when exit code is non-zero', async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 1, output: 'Failed' });

      const result = await plugin.execute(createInput());

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('parses errors into diagnostics', async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 1, output: errorOutput });

      const result = await plugin.execute(createInput());

      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0].tool).toBe(`${packageManager}.${action}`);
    });
  });
}

export function describeRunPlugin(config: RunTestConfig): void {
  const { plugin, packageManager, description, errorOutput, failureOutput, mockExecuteCommand } = config;

  describe(`${packageManager}.run plugin`, () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('has correct metadata', () => {
      expect(plugin.name).toBe(`${packageManager}.run`);
      expect(plugin.description).toBe(description);
      expect(plugin.mutatesWorkspace).toBe(true);
    });

    it(`executes ${packageManager} run with script name`, async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 0, output: '' });

      const input = createInput(['build']);
      await plugin.execute(input);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        command: packageManager,
        args: ['run', 'build'],
        cwd: '/test/project',
        runWriter: input.runWriter,
      });
    });

    it('passes additional args after -- separator', async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 0, output: '' });

      const input = createInput(['test', '--coverage', '--watch']);
      await plugin.execute(input);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        command: packageManager,
        args: ['run', 'test', '--', '--coverage', '--watch'],
        cwd: '/test/project',
        runWriter: input.runWriter,
      });
    });

    it('returns success when exit code is 0', async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 0, output: 'Success' });

      const result = await plugin.execute(createInput(['build']));

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('returns failure when exit code is non-zero', async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 1, output: failureOutput });

      const result = await plugin.execute(createInput(['invalid-script']));

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('parses errors into diagnostics', async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 1, output: errorOutput });

      const result = await plugin.execute(createInput(['failing-script']));

      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0].tool).toBe(`${packageManager}.run`);
    });
  });
}
