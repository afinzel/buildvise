/**
 * Tests for pnpm.run plugin
 */

import { vi } from 'vitest';
import { pnpmRunPlugin } from '../../../src/plugins/pnpm/pnpm-run.js';
import { describeRunPlugin } from '../package-manager/pm-plugin-tests.js';

vi.mock('../../../src/plugins/executor.js', () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from '../../../src/plugins/executor.js';

describeRunPlugin({
  plugin: pnpmRunPlugin,
  packageManager: 'pnpm',
  description: 'Run pnpm scripts',
  errorOutput: 'ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command failed',
  failureOutput: 'ERR_PNPM_NO_SCRIPT  Missing script: invalid-script',
  mockExecuteCommand: vi.mocked(executeCommand),
});
