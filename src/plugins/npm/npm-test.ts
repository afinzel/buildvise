/**
 * npm.test plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { chainParsers } from '../parse-chain.js';
import { parseNpmOutput } from './parse-npm.js';
import { parseTypescriptOutput } from '../typescript/parse-typescript.js';
import { parseJestOutput, parseJestSummary } from '../jest/index.js';
import { parseVitestOutput, parseVitestSummary } from '../vitest/index.js';

export const npmTestPlugin: Plugin = {
  name: 'npm.test',
  description: 'Run npm test script',
  mutatesWorkspace: false,
  inputSchema: {
    type: 'object',
    properties: {
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional arguments passed to the test script',
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
      args.length > 0 ? ['run', 'test', '--', ...args] : ['run', 'test'];

    const result = await executeCommand({
      command: 'npm',
      args: commandArgs,
      cwd,
      runWriter,
    });

    const diagnostics = chainParsers(
      [parseNpmOutput, parseTypescriptOutput, parseJestOutput, parseVitestOutput],
      { tool: 'npm.test', output: result.output }
    );

    const summary = parseJestSummary(result.output) ?? parseVitestSummary(result.output);

    return {
      success: result.exitCode === 0,
      diagnostics,
      exitCode: result.exitCode,
      summary,
    };
  },
};
