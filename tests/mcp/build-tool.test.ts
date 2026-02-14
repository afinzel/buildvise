/**
 * Tests for MCP build tool handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleBuildTool, type BuildToolInput } from '../../src/mcp/build-tool.js';
import type { ToolResponse } from '../../src/types/index.js';

function createMockCli() {
  return {
    exec: vi.fn<(tool: string, cwd: string | undefined, args: string[]) => Promise<ToolResponse>>(),
    list: vi.fn(),
    raw: vi.fn(),
    logRange: vi.fn(),
  };
}

describe('handleBuildTool', () => {
  let cli: ReturnType<typeof createMockCli>;

  beforeEach(() => {
    cli = createMockCli();
  });

  describe('action: exec', () => {
    it('calls cli.exec and returns response with hint on success', async () => {
      const response: ToolResponse = {
        success: true,
        runId: 'abc-123',
      };
      cli.exec.mockResolvedValue(response);

      const result = await handleBuildTool(cli, {
        action: 'exec',
        tool: 'npm.build',
        cwd: '/project',
        args: ['--verbose'],
      });

      expect(cli.exec).toHaveBeenCalledWith('npm.build', '/project', ['--verbose']);
      expect(result).toMatchObject({
        success: true,
        runId: 'abc-123',
        hint: expect.stringContaining('issues'),
      });
    });

    it('includes log hint on failure', async () => {
      const response: ToolResponse = {
        success: false,
        runId: 'def-456',
        errors: [{ message: 'TS2345: Type error' }],
      };
      cli.exec.mockResolvedValue(response);

      const result = await handleBuildTool(cli, {
        action: 'exec',
        tool: 'npm.build',
        cwd: '/project',
      });

      expect(result).toMatchObject({
        success: false,
        runId: 'def-456',
        hint: expect.stringContaining("action: 'log'"),
      });
      expect((result as ToolResponse).hint).toContain('def-456');
    });

    it('defaults args to empty array', async () => {
      cli.exec.mockResolvedValue({ success: true, runId: 'r1' });

      await handleBuildTool(cli, { action: 'exec', tool: 'npm.test' });

      expect(cli.exec).toHaveBeenCalledWith('npm.test', undefined, []);
    });

    it('returns error when tool is missing', async () => {
      const result = await handleBuildTool(cli, { action: 'exec' } as BuildToolInput);

      expect(result).toEqual({ error: "Missing required parameter 'tool' for exec action" });
      expect(cli.exec).not.toHaveBeenCalled();
    });
  });

  describe('action: log', () => {
    it('calls cli.logRange with provided params', async () => {
      cli.logRange.mockReturnValue({
        lines: ['line 1', 'line 2'],
        startLine: 5,
        endLine: 6,
        totalLines: 100,
        hasMore: true,
      });

      const result = await handleBuildTool(cli, {
        action: 'log',
        runId: 'abc-123',
        startLine: 5,
        lineCount: 10,
      });

      expect(cli.logRange).toHaveBeenCalledWith('abc-123', 5, 10);
      expect(result).toMatchObject({ lines: ['line 1', 'line 2'] });
    });

    it('defaults startLine to 1', async () => {
      cli.logRange.mockReturnValue({ lines: [], startLine: 1, endLine: 0, totalLines: 0, hasMore: false });

      await handleBuildTool(cli, { action: 'log', runId: 'abc-123' });

      expect(cli.logRange).toHaveBeenCalledWith('abc-123', 1, undefined);
    });

    it('returns error when runId is missing', async () => {
      const result = await handleBuildTool(cli, { action: 'log' } as BuildToolInput);

      expect(result).toEqual({ error: "Missing required parameter 'runId' for log action" });
      expect(cli.logRange).not.toHaveBeenCalled();
    });
  });

  describe('action: list', () => {
    it('calls cli.list and returns tool list', async () => {
      const tools = {
        tools: [
          { name: 'npm.build', description: 'Run npm build' },
          { name: 'npm.test', description: 'Run npm test' },
        ],
      };
      cli.list.mockReturnValue(tools);

      const result = await handleBuildTool(cli, { action: 'list' });

      expect(cli.list).toHaveBeenCalled();
      expect(result).toEqual(tools);
    });
  });
});
