/**
 * Tests for npm.run plugin
 */

import { vi } from 'vitest';
import { npmRunPlugin } from '../../../src/plugins/npm/npm-run.js';
import { describeRunPlugin } from '../package-manager/pm-plugin-tests.js';

vi.mock('../../../src/plugins/executor.js', () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from '../../../src/plugins/executor.js';

describeRunPlugin({
  plugin: npmRunPlugin,
  packageManager: 'npm',
  description: 'Run npm scripts',
  errorOutput: 'npm error code ELIFECYCLE\nnpm error errno 1',
  failureOutput: 'npm ERR! missing script: invalid-script',
  mockExecuteCommand: vi.mocked(executeCommand),
});
