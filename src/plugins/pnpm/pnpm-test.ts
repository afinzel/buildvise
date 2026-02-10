/**
 * pnpm.test plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { chainParsers } from '../parse-chain.js';
import { parsePnpmOutput } from './parse-pnpm.js';
import { parseTypescriptOutput } from '../typescript/parse-typescript.js';
import { parseJestOutput, parseJestSummary } from '../jest/index.js';
import { parseVitestOutput, parseVitestSummary } from '../vitest/index.js';

export const pnpmTestPlugin: Plugin = {
  name: 'pnpm.test',
  description: 'Run pnpm test script',
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
      command: 'pnpm',
      args: commandArgs,
      cwd,
      runWriter,
    });

    const diagnostics = chainParsers(
      [parsePnpmOutput, parseTypescriptOutput, parseJestOutput, parseVitestOutput],
      { tool: 'pnpm.test', output: result.output }
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
