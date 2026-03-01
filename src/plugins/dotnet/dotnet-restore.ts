/**
 * dotnet.restore plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { buildInputSchema } from '../shared-schema.js';
import { parseBuildOutput } from './parse-build.js';

export const dotnetRestorePlugin: Plugin = {
  name: 'dotnet.restore',
  description:
    'Restore NuGet packages for a .NET project or solution. Returns structured restore errors and warnings. ' +
    'Use run_raw with the returned runId to get full output if errors array is empty but success=false.',
  mutatesWorkspace: true,
  inputSchema: buildInputSchema(
    'Arguments passed to dotnet restore. Supports standard dotnet restore arguments. ' +
    'Examples: ["--source", "https://api.nuget.org/v3/index.json"] for custom source, ' +
    '["--no-cache"] to skip the HTTP cache, ' +
    '["--verbosity", "minimal"] to reduce output.'
  ),

  async execute(input: PluginInput): Promise<PluginOutput> {
    const { args, cwd, runWriter } = input;

    const result = await executeCommand({
      command: 'dotnet',
      args: ['restore', ...args],
      cwd,
      runWriter,
    });

    const diagnostics = parseBuildOutput({
      tool: 'dotnet.restore',
      output: result.output,
    });

    return {
      success: result.exitCode === 0,
      diagnostics,
      exitCode: result.exitCode,
    };
  },
};
