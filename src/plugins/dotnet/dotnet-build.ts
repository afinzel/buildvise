/**
 * dotnet.build plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { parseBuildOutput } from './parse-build.js';

export const dotnetBuildPlugin: Plugin = {
  name: 'dotnet.build',
  description:
    'Build a .NET project or solution. Returns structured build errors and warnings. ' +
    'Use run_raw with the returned runId to get full output if errors array is empty but success=false.',
  mutatesWorkspace: false,
  inputSchema: {
    type: 'object',
    properties: {
      args: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Arguments passed to dotnet build. Supports standard dotnet build arguments. ' +
          'Examples: ["--configuration", "Release"] for release builds, ' +
          '["--no-restore"] to skip package restore, ' +
          '["--verbosity", "minimal"] to reduce output.',
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
      args: ['build', ...args],
      cwd,
      runWriter,
    });

    const diagnostics = parseBuildOutput({
      tool: 'dotnet.build',
      output: result.output,
    });

    return {
      success: result.exitCode === 0,
      diagnostics,
      exitCode: result.exitCode,
    };
  },
};
