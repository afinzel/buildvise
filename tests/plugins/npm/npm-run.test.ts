/**
 * Tests for npm.run plugin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { npmRunPlugin } from '../../../src/plugins/npm/npm-run.js';
import type { PluginInput } from '../../../src/plugins/types.js';
import type { RunWriter } from '../../../src/storage/index.js';

vi.mock('../../../src/plugins/executor.js', () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from '../../../src/plugins/executor.js';

const mockExecuteCommand = vi.mocked(executeCommand);

function createMockRunWriter(): RunWriter {
  return {
    runId: 'test-run-id',
    appendLog: vi.fn(),
    writeDiagnostics: vi.fn(),
    complete: vi.fn(),
  };
}

function createInput(args: string[], cwd = '/test/project'): PluginInput {
  return {
    args,
    cwd,
    runWriter: createMockRunWriter(),
  };
}

describe('npmRunPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct metadata', () => {
    expect(npmRunPlugin.name).toBe('npm.run');
    expect(npmRunPlugin.description).toBe('Run npm scripts');
    expect(npmRunPlugin.mutatesWorkspace).toBe(true);
  });

  it('executes npm run with script name', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      output: '',
    });

    const input = createInput(['build']);
    await npmRunPlugin.execute(input);

    expect(mockExecuteCommand).toHaveBeenCalledWith({
      command: 'npm',
      args: ['run', 'build'],
      cwd: '/test/project',
      runWriter: input.runWriter,
    });
  });

  it('passes additional args after -- separator', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      output: '',
    });

    const input = createInput(['test', '--coverage', '--watch']);
    await npmRunPlugin.execute(input);

    expect(mockExecuteCommand).toHaveBeenCalledWith({
      command: 'npm',
      args: ['run', 'test', '--', '--coverage', '--watch'],
      cwd: '/test/project',
      runWriter: input.runWriter,
    });
  });

  it('returns success when exit code is 0', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      output: 'Build completed successfully',
    });

    const result = await npmRunPlugin.execute(createInput(['build']));

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('returns failure when exit code is non-zero', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      output: 'npm ERR! missing script: invalid-script',
    });

    const result = await npmRunPlugin.execute(createInput(['invalid-script']));

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('parses npm errors into diagnostics', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      output: 'npm error code ELIFECYCLE\nnpm error errno 1',
    });

    const result = await npmRunPlugin.execute(createInput(['failing-script']));

    expect(result.success).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].tool).toBe('npm.run');
  });
});
