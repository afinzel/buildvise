/**
 * Tests for npm.test plugin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { npmTestPlugin } from '../../../src/plugins/npm/npm-test.js';
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

function createInput(args: string[] = [], cwd = '/test/project'): PluginInput {
  return {
    args,
    cwd,
    runWriter: createMockRunWriter(),
  };
}

describe('npmTestPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct metadata', () => {
    expect(npmTestPlugin.name).toBe('npm.test');
    expect(npmTestPlugin.description).toBe('Run npm test script');
    expect(npmTestPlugin.mutatesWorkspace).toBe(false);
  });

  it('executes npm run test', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      output: '',
    });

    const input = createInput();
    await npmTestPlugin.execute(input);

    expect(mockExecuteCommand).toHaveBeenCalledWith({
      command: 'npm',
      args: ['run', 'test'],
      cwd: '/test/project',
      runWriter: input.runWriter,
    });
  });

  it('passes additional args after -- separator', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      output: '',
    });

    const input = createInput(['--coverage', '--watch']);
    await npmTestPlugin.execute(input);

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
      output: 'All tests passed',
    });

    const result = await npmTestPlugin.execute(createInput());

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('returns failure when exit code is non-zero', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      output: 'Tests failed',
    });

    const result = await npmTestPlugin.execute(createInput());

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('parses npm errors into diagnostics', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      output: 'npm error code ELIFECYCLE\nnpm error errno 1',
    });

    const result = await npmTestPlugin.execute(createInput());

    expect(result.success).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].tool).toBe('npm.test');
  });
});
