/**
 * Tests for npm.build plugin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { npmBuildPlugin } from '../../../src/plugins/npm/npm-build.js';
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

describe('npmBuildPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct metadata', () => {
    expect(npmBuildPlugin.name).toBe('npm.build');
    expect(npmBuildPlugin.description).toBe('Run npm build script');
    expect(npmBuildPlugin.mutatesWorkspace).toBe(false);
  });

  it('executes npm run build', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      output: '',
    });

    const input = createInput();
    await npmBuildPlugin.execute(input);

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

    const input = createInput(['--production', '--minify']);
    await npmBuildPlugin.execute(input);

    expect(mockExecuteCommand).toHaveBeenCalledWith({
      command: 'npm',
      args: ['run', 'build', '--', '--production', '--minify'],
      cwd: '/test/project',
      runWriter: input.runWriter,
    });
  });

  it('returns success when exit code is 0', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 0,
      output: 'Build completed successfully',
    });

    const result = await npmBuildPlugin.execute(createInput());

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('returns failure when exit code is non-zero', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      output: 'Build failed',
    });

    const result = await npmBuildPlugin.execute(createInput());

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('parses npm errors into diagnostics', async () => {
    mockExecuteCommand.mockResolvedValue({
      exitCode: 1,
      output: 'npm error code ELIFECYCLE\nnpm error errno 1',
    });

    const result = await npmBuildPlugin.execute(createInput());

    expect(result.success).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].tool).toBe('npm.build');
  });
});
