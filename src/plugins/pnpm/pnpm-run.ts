/**
 * pnpm.run plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { chainParsers } from '../parse-chain.js';
import { parsePnpmOutput } from './parse-pnpm.js';
import { parseTypescriptOutput } from '../typescript/parse-typescript.js';

export const pnpmRunPlugin: Plugin = {
  name: 'pnpm.run',
  description: 'Run pnpm scripts',
  mutatesWorkspace: false,
  inputSchema: {
    type: 'object',
    properties: {
      args: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Arguments: first is script name, rest are passed after -- to the script',
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

    const [scriptName, ...scriptArgs] = args;
    const commandArgs =
      scriptArgs.length > 0
        ? ['run', scriptName, '--', ...scriptArgs]
        : ['run', scriptName];

    const result = await executeCommand({
      command: 'pnpm',
      args: commandArgs,
      cwd,
      runWriter,
    });

    const diagnostics = chainParsers(
      [parsePnpmOutput, parseTypescriptOutput],
      { tool: 'pnpm.run', output: result.output }
    );

    return {
      success: result.exitCode === 0,
      diagnostics,
      exitCode: result.exitCode,
    };
  },
};
