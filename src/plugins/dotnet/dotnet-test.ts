/**
 * dotnet.test plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { chainParsers } from '../parse-chain.js';
import { parseBuildOutput } from './parse-build.js';
import { parseTestOutput, parseDotnetTestSummary } from './parse-test.js';

export const dotnetTestPlugin: Plugin = {
  name: 'dotnet.test',
  description:
    'Run .NET tests. Returns structured test results with pass/fail counts. ' +
    'Use run_raw with the returned runId to get full stack traces and detailed output.',
  mutatesWorkspace: false,
  inputSchema: {
    type: 'object',
    properties: {
      args: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Arguments passed to dotnet test. Supports standard dotnet test arguments. ' +
          'Examples: ["--filter", "FullyQualifiedName~MyTestName"] to run specific tests, ' +
          '["--verbosity", "detailed"] for verbose output, ' +
          '["--no-build"] to skip building before testing.',
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
      command: 'dotnet',
      args: ['test', ...args],
      cwd,
      runWriter,
    });

    const diagnostics = chainParsers(
      [parseBuildOutput, parseTestOutput],
      { tool: 'dotnet.test', output: result.output }
    );

    const summary = parseDotnetTestSummary(result.output);

    return {
      success: result.exitCode === 0,
      diagnostics,
      exitCode: result.exitCode,
      summary,
    };
  },
};
