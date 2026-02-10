/**
 * Tool handler - bridges MCP tools to plugins
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  createSuccessResponse,
  createErrorResponse,
  createDiagnostic,
  type ToolResponse,
} from '../types/index.js';
import type { PluginRegistry } from '../plugins/index.js';
import type { StorageAPI } from '../storage/index.js';
import type { ToolInput } from './types.js';
import type { ConfirmationRequest } from './permission-types.js';
import { checkPermission } from './permission-handler.js';

export interface ToolHandlerDependencies {
  registry: PluginRegistry;
  storage: StorageAPI;
  defaultCwd: string;
}

export type ToolCallResult = ToolResponse | ConfirmationRequest;

export interface ToolHandler {
  handleToolCall(toolName: string, input: ToolInput): Promise<ToolCallResult>;
}

export function createToolHandler(deps: ToolHandlerDependencies): ToolHandler {
  const { registry, storage, defaultCwd } = deps;

  return {
    async handleToolCall(toolName: string, input: ToolInput): Promise<ToolCallResult> {
      const plugin = registry.get(toolName);

      if (!plugin) {
        return createErrorResponse('', [
          createDiagnostic({
            tool: toolName,
            severity: 'error',
            message: `Unknown tool: ${toolName}`,
            code: 'UNKNOWN_TOOL',
          }),
        ]);
      }

      const rawCwd = input.cwd ?? defaultCwd;
      const cwd = path.isAbsolute(rawCwd) ? rawCwd : path.resolve(defaultCwd, rawCwd);
      const args = input.args ?? [];

      if (!existsSync(cwd)) {
        return createErrorResponse('', [
          createDiagnostic({
            tool: plugin.name,
            severity: 'error',
            message: `Working directory does not exist: ${cwd}`,
            code: 'INVALID_CWD',
          }),
        ]);
      }

      const permissionCheck = checkPermission({
        plugin,
        args,
        cwd,
        confirmed: input.confirmed,
      });

      if (!permissionCheck.allowed) {
        return permissionCheck.confirmationRequest!;
      }

      const command = [plugin.name.split('.')[0], ...args];
      const runWriter = storage.createRun(plugin.name, cwd, command);

      try {
        const output = await plugin.execute({
          args,
          cwd,
          runWriter,
        });

        runWriter.writeDiagnostics(output.diagnostics);
        runWriter.complete(output.exitCode);

        const errors = output.diagnostics.filter((d) => d.severity === 'error');
        const warnings = output.diagnostics.filter((d) => d.severity === 'warning');
        const options = output.summary ? { summary: output.summary } : {};

        if (output.success) {
          return createSuccessResponse(runWriter.runId, warnings, options);
        } else {
          return createErrorResponse(runWriter.runId, errors, warnings, options);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        runWriter.complete(1);

        return createErrorResponse(runWriter.runId, [
          createDiagnostic({
            tool: plugin.name,
            severity: 'error',
            message: `Execution failed: ${message}`,
            code: 'EXECUTION_ERROR',
          }),
        ]);
      }
    },
  };
}
