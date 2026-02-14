/**
 * Tests for pnpm.test plugin
 */

import { vi } from 'vitest';
import { pnpmTestPlugin } from '../../../src/plugins/pnpm/pnpm-test.js';
import { describeBuildOrTestPlugin } from '../package-manager/pm-plugin-tests.js';

vi.mock('../../../src/plugins/executor.js', () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from '../../../src/plugins/executor.js';

describeBuildOrTestPlugin({
  plugin: pnpmTestPlugin,
  packageManager: 'pnpm',
  action: 'test',
  description: 'Run pnpm test script',
  errorOutput: 'ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command failed',
  mockExecuteCommand: vi.mocked(executeCommand),
});
