/**
 * Tests for pnpm.build plugin
 */

import { vi } from 'vitest';
import { pnpmBuildPlugin } from '../../../src/plugins/pnpm/pnpm-build.js';
import { describeBuildOrTestPlugin } from '../package-manager/pm-plugin-tests.js';

vi.mock('../../../src/plugins/executor.js', () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from '../../../src/plugins/executor.js';

describeBuildOrTestPlugin({
  plugin: pnpmBuildPlugin,
  packageManager: 'pnpm',
  action: 'build',
  description: 'Run pnpm build script',
  errorOutput: 'ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command failed',
  mockExecuteCommand: vi.mocked(executeCommand),
});
