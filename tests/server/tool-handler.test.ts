import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { createToolHandler, type ToolCallResult } from '../../src/server/tool-handler.js';
import { createPluginRegistry } from '../../src/plugins/index.js';
import { createStorage } from '../../src/storage/index.js';
import { createDiagnostic, type ToolResponse } from '../../src/types/index.js';
import type { Plugin, PluginInput, PluginOutput } from '../../src/plugins/index.js';
import { isConfirmationRequest, type ConfirmationRequest } from '../../src/server/permission-types.js';

const TEST_DIR = '/tmp/mcp-build-handler-test';

function isToolResponse(result: ToolCallResult): result is ToolResponse {
  return 'success' in result && 'runId' in result;
}

import type { TestSummary } from '../../src/types/index.js';

function createMockPlugin(
  name: string,
  options: {
    mutates?: boolean;
    success?: boolean;
    diagnostics?: ReturnType<typeof createDiagnostic>[];
    exitCode?: number;
    summary?: TestSummary;
  } = {}
): Plugin {
  const {
    mutates = false,
    success = true,
    diagnostics = [],
    exitCode = success ? 0 : 1,
    summary,
  } = options;

  return {
    name,
    description: `Mock plugin ${name}`,
    mutatesWorkspace: mutates,
    inputSchema: {
      type: 'object',
      properties: {
        args: { type: 'array', items: { type: 'string' } },
        cwd: { type: 'string' },
      },
    },
    async execute(_input: PluginInput): Promise<PluginOutput> {
      return { success, diagnostics, exitCode, summary };
    },
  };
}

describe('createToolHandler', () => {
  beforeEach(() => {
    process.env.XDG_DATA_HOME = TEST_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.XDG_DATA_HOME;
  });

  describe('handleToolCall', () => {
    it('returns error for unknown tool', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: '/tmp',
      });

      const result = await handler.handleToolCall('unknown.tool', {});

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('UNKNOWN_TOOL');
      }
    });

    it('returns error for non-existent cwd', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin = createMockPlugin('test.tool');
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: '/tmp',
      });

      const result = await handler.handleToolCall('test.tool', {
        cwd: '/nonexistent/path/that/does/not/exist',
      });

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('INVALID_CWD');
        expect(result.errors[0].message).toContain('/nonexistent/path/that/does/not/exist');
      }
    });

    it('resolves relative cwd against defaultCwd', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin = createMockPlugin('test.tool');
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: TEST_DIR,
      });

      // Create a subdirectory
      mkdirSync(`${TEST_DIR}/subdir`, { recursive: true });

      const result = await handler.handleToolCall('test.tool', {
        cwd: 'subdir',
      });

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.success).toBe(true);
      }
    });

    it('executes non-mutating plugin without confirmation', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin = createMockPlugin('test.tool');
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: '/tmp',
      });

      const result = await handler.handleToolCall('test.tool', {});

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.success).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(result.runId).toBeTruthy();
      }
    });

    it('returns error response when plugin fails', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin = createMockPlugin('failing.tool', {
        success: false,
        diagnostics: [
          createDiagnostic({
            tool: 'failing.tool',
            severity: 'error',
            message: 'Build failed',
          }),
        ],
      });
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: '/tmp',
      });

      const result = await handler.handleToolCall('failing.tool', {});

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toBe('Build failed');
      }
    });

    it('separates errors and warnings', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin = createMockPlugin('mixed.tool', {
        success: false,
        diagnostics: [
          createDiagnostic({
            tool: 'mixed.tool',
            severity: 'error',
            message: 'Error message',
          }),
          createDiagnostic({
            tool: 'mixed.tool',
            severity: 'warning',
            message: 'Warning message',
          }),
        ],
      });
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: '/tmp',
      });

      const result = await handler.handleToolCall('mixed.tool', {});

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.errors).toHaveLength(1);
        expect(result.warnings).toHaveLength(1);
      }
    });

    it('handles plugin execution error', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin: Plugin = {
        name: 'throwing.tool',
        description: 'Test',
        mutatesWorkspace: false,
        inputSchema: { type: 'object' },
        async execute(): Promise<PluginOutput> {
          throw new Error('Unexpected error');
        },
      };
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: '/tmp',
      });

      const result = await handler.handleToolCall('throwing.tool', {});

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.success).toBe(false);
        expect(result.errors[0].code).toBe('EXECUTION_ERROR');
        expect(result.errors[0].message).toContain('Unexpected error');
      }
    });

    it('stores run data for later retrieval', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin = createMockPlugin('storage.test', {
        diagnostics: [
          createDiagnostic({
            tool: 'storage.test',
            severity: 'warning',
            message: 'Test warning',
          }),
        ],
      });
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: '/tmp',
      });

      const result = await handler.handleToolCall('storage.test', {});

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        const reader = storage.getRun(result.runId);
        expect(reader).not.toBeNull();
        expect(reader!.meta.tool).toBe('storage.test');
        expect(reader!.getDiagnostics()).toHaveLength(1);
      }
    });

    it('propagates test summary to response', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const summary = { passed: 10, failed: 1, skipped: 0, total: 11 };
      const plugin = createMockPlugin('test.runner', { summary });
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: '/tmp',
      });

      const result = await handler.handleToolCall('test.runner', {});

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.summary).toEqual(summary);
      }
    });

    it('omits summary when plugin does not provide one', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin = createMockPlugin('build.tool');
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: '/tmp',
      });

      const result = await handler.handleToolCall('build.tool', {});

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.summary).toBeUndefined();
      }
    });

    it('includes summary even when tests fail', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const summary = { passed: 9, failed: 2, skipped: 0, total: 11 };
      const plugin = createMockPlugin('test.runner', {
        success: false,
        summary,
        diagnostics: [
          createDiagnostic({
            tool: 'test.runner',
            severity: 'error',
            message: 'Test failed',
          }),
        ],
      });
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: '/tmp',
      });

      const result = await handler.handleToolCall('test.runner', {});

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.success).toBe(false);
        expect(result.summary).toEqual(summary);
      }
    });
  });

  describe('permissions', () => {
    it('returns confirmation request for mutating plugin without confirmation', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin = createMockPlugin('npm.install', { mutates: true });
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: TEST_DIR,
      });

      const result = await handler.handleToolCall('npm.install', {
        args: ['typescript'],
      });

      expect(isConfirmationRequest(result)).toBe(true);
      if (isConfirmationRequest(result)) {
        expect(result.confirmationRequired).toBe(true);
        expect(result.tool).toBe('npm.install');
        expect(result.args).toEqual(['typescript']);
        expect(result.cwd).toBe(TEST_DIR);
      }
    });

    it('executes mutating plugin when confirmed', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin = createMockPlugin('npm.install', { mutates: true });
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: TEST_DIR,
      });

      const result = await handler.handleToolCall('npm.install', {
        args: ['typescript'],
        confirmed: true,
      });

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.success).toBe(true);
      }
    });

    it('does not require confirmation for non-mutating plugins', async () => {
      const registry = createPluginRegistry();
      const storage = createStorage();
      const plugin = createMockPlugin('dotnet.build', { mutates: false });
      registry.register(plugin);

      const handler = createToolHandler({
        registry,
        storage,
        defaultCwd: TEST_DIR,
      });

      const result = await handler.handleToolCall('dotnet.build', {});

      expect(isToolResponse(result)).toBe(true);
      if (isToolResponse(result)) {
        expect(result.success).toBe(true);
      }
    });
  });
});
