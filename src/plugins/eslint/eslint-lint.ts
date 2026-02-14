/**
 * eslint.lint plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { buildInputSchema } from '../shared-schema.js';
import { parseEslintOutput } from './parse-eslint.js';
import { validateEslintArgs } from '../../utils/security.js';

export const eslintLintPlugin: Plugin = {
  name: 'eslint.lint',
  description: 'Run ESLint to lint JavaScript/TypeScript files',
  mutatesWorkspace: false,
  inputSchema: buildInputSchema(
    'Arguments passed to eslint (e.g. paths, --ext, --max-warnings)',
    { includeConfirmed: false }
  ),

  async execute(input: PluginInput): Promise<PluginOutput> {
    const { args, cwd, runWriter } = input;
    validateEslintArgs(args);

    const result = await executeCommand({
      command: 'eslint',
      args: [...args, '--format', 'json'],
      cwd,
      runWriter,
    });

    const diagnostics = parseEslintOutput({
      tool: 'eslint.lint',
      output: result.output,
    });

    // Exit 0 = no errors, Exit 1 = lint errors found, Exit 2 = config/fatal error
    const success = result.exitCode === 0 || result.exitCode === 1;

    return {
      success,
      diagnostics,
      exitCode: result.exitCode,
    };
  },
};
