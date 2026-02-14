/**
 * Tests for npm.test plugin
 */

import { vi } from 'vitest';
import { npmTestPlugin } from '../../../src/plugins/npm/npm-test.js';
import { describeBuildOrTestPlugin } from '../package-manager/pm-plugin-tests.js';

vi.mock('../../../src/plugins/executor.js', () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from '../../../src/plugins/executor.js';

describeBuildOrTestPlugin({
  plugin: npmTestPlugin,
  packageManager: 'npm',
  action: 'test',
  description: 'Run npm test script',
  errorOutput: 'npm error code ELIFECYCLE\nnpm error errno 1',
  mockExecuteCommand: vi.mocked(executeCommand),
});
