/**
 * npm.build plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { chainParsers } from '../parse-chain.js';
import { parseNpmOutput } from './parse-npm.js';
import { parseTypescriptOutput } from '../typescript/parse-typescript.js';
import { parseNextjsOutput } from '../nextjs/parse-nextjs.js';

export const npmBuildPlugin: Plugin = {
  name: 'npm.build',
  description: 'Run npm build script',
  mutatesWorkspace: false,
  inputSchema: {
    type: 'object',
    properties: {
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional arguments passed to the build script',
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

    const commandArgs =
      args.length > 0 ? ['run', 'build', '--', ...args] : ['run', 'build'];

    const result = await executeCommand({
      command: 'npm',
      args: commandArgs,
      cwd,
      runWriter,
    });

    const diagnostics = chainParsers(
      [parseNpmOutput, parseTypescriptOutput, parseNextjsOutput],
      { tool: 'npm.build', output: result.output }
    );

    return {
      success: result.exitCode === 0,
      diagnostics,
      exitCode: result.exitCode,
    };
  },
};
