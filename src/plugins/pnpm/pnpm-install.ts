/**
 * pnpm.install plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { parsePnpmOutput } from './parse-pnpm.js';

export const pnpmInstallPlugin: Plugin = {
  name: 'pnpm.install',
  description: 'Install pnpm packages',
  mutatesWorkspace: true,
  inputSchema: {
    type: 'object',
    properties: {
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Arguments passed to pnpm install (e.g. package names, --save-dev)',
      },
      cwd: {
        type: 'string',
        description: 'Working directory',
      },
      confirmed: {
        type: 'boolean',
        description: 'Confirmation for mutating operations',
      },
    },
  },

  async execute(input: PluginInput): Promise<PluginOutput> {
    const { args, cwd, runWriter } = input;

    const result = await executeCommand({
      command: 'pnpm',
      args: ['install', ...args],
      cwd,
      runWriter,
    });

    const diagnostics = parsePnpmOutput({
      tool: 'pnpm.install',
      output: result.output,
    });

    return {
      success: result.exitCode === 0,
      diagnostics,
      exitCode: result.exitCode,
    };
  },
};
