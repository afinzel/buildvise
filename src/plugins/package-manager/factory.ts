/**
 * Factory for creating package manager plugins (npm, pnpm)
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import type { OutputParser } from '../parse-chain.js';
import { executeCommand } from '../executor.js';
import { chainParsers } from '../parse-chain.js';
import { buildInputSchema } from '../shared-schema.js';
import { validateScriptName } from '../../utils/security.js';
import { parseTypescriptOutput } from '../typescript/parse-typescript.js';
import { parseNextjsOutput } from '../nextjs/parse-nextjs.js';
import { parseJestOutput, parseJestSummary } from '../jest/index.js';
import { parseVitestOutput, parseVitestSummary } from '../vitest/index.js';

type Action = 'install' | 'build' | 'test' | 'run';

interface PackageManagerPluginConfig {
  packageManager: string;
  action: Action;
  description: string;
  mutatesWorkspace: boolean;
  parser: OutputParser;
  argsDescription: string;
}

export function createPackageManagerPlugin(config: PackageManagerPluginConfig): Plugin {
  const { packageManager, action, description, mutatesWorkspace, parser, argsDescription } = config;
  const name = `${packageManager}.${action}`;

  return {
    name,
    description,
    mutatesWorkspace,
    inputSchema: buildInputSchema(argsDescription),

    async execute(input: PluginInput): Promise<PluginOutput> {
      const { args, cwd, runWriter } = input;

      switch (action) {
        case 'install': {
          const result = await executeCommand({
            command: packageManager,
            args: ['install', ...args],
            cwd,
            runWriter,
          });

          const diagnostics = parser({ tool: name, output: result.output });

          return {
            success: result.exitCode === 0,
            diagnostics,
            exitCode: result.exitCode,
          };
        }

        case 'build': {
          const commandArgs =
            args.length > 0 ? ['run', 'build', '--', ...args] : ['run', 'build'];

          const result = await executeCommand({
            command: packageManager,
            args: commandArgs,
            cwd,
            runWriter,
          });

          const diagnostics = chainParsers(
            [parser, parseTypescriptOutput, parseNextjsOutput],
            { tool: name, output: result.output }
          );

          return {
            success: result.exitCode === 0,
            diagnostics,
            exitCode: result.exitCode,
          };
        }

        case 'test': {
          const commandArgs =
            args.length > 0 ? ['run', 'test', '--', ...args] : ['run', 'test'];

          const result = await executeCommand({
            command: packageManager,
            args: commandArgs,
            cwd,
            runWriter,
          });

          const diagnostics = chainParsers(
            [parser, parseTypescriptOutput, parseJestOutput, parseVitestOutput],
            { tool: name, output: result.output }
          );

          const summary = parseJestSummary(result.output) ?? parseVitestSummary(result.output);

          return {
            success: result.exitCode === 0,
            diagnostics,
            exitCode: result.exitCode,
            summary,
          };
        }

        case 'run': {
          const [scriptName, ...scriptArgs] = args;
          validateScriptName(scriptName);
          const commandArgs =
            scriptArgs.length > 0
              ? ['run', scriptName, '--', ...scriptArgs]
              : ['run', scriptName];

          const result = await executeCommand({
            command: packageManager,
            args: commandArgs,
            cwd,
            runWriter,
          });

          const diagnostics = chainParsers(
            [parser, parseTypescriptOutput],
            { tool: name, output: result.output }
          );

          return {
            success: result.exitCode === 0,
            diagnostics,
            exitCode: result.exitCode,
          };
        }
      }
    },
  };
}
