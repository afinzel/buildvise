/**
 * pnpm.test plugin
 */

import { createPackageManagerPlugin } from '../package-manager/factory.js';
import { parsePnpmOutput } from './parse-pnpm.js';

export const pnpmTestPlugin = createPackageManagerPlugin({
  packageManager: 'pnpm',
  action: 'test',
  description: 'Run pnpm test script',
  mutatesWorkspace: false,
  parser: parsePnpmOutput,
  argsDescription: 'Additional arguments passed to the test script',
});
