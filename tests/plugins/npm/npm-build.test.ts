/**
 * Tests for npm.build plugin
 */

import { vi } from 'vitest';
import { npmBuildPlugin } from '../../../src/plugins/npm/npm-build.js';
import { describeBuildOrTestPlugin } from '../package-manager/pm-plugin-tests.js';

vi.mock('../../../src/plugins/executor.js', () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from '../../../src/plugins/executor.js';

describeBuildOrTestPlugin({
  plugin: npmBuildPlugin,
  packageManager: 'npm',
  action: 'build',
  description: 'Run npm build script',
  errorOutput: 'npm error code ELIFECYCLE\nnpm error errno 1',
  mockExecuteCommand: vi.mocked(executeCommand),
});
