/**
 * npm.install plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { parseNpmOutput } from './parse-npm.js';

export const npmInstallPlugin: Plugin = {
  name: 'npm.install',
  description: 'Install npm packages',
  mutatesWorkspace: true,
  inputSchema: {
    type: 'object',
    properties: {
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Arguments passed to npm install (e.g. package names, --save-dev)',
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
      command: 'npm',
      args: ['install', ...args],
      cwd,
      runWriter,
    });

    const diagnostics = parseNpmOutput({
      tool: 'npm.install',
      output: result.output,
    });

    return {
      success: result.exitCode === 0,
      diagnostics,
      exitCode: result.exitCode,
    };
  },
};
