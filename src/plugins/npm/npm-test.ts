/**
 * npm.test plugin
 */

import { createPackageManagerPlugin } from '../package-manager/factory.js';
import { parseNpmOutput } from './parse-npm.js';

export const npmTestPlugin = createPackageManagerPlugin({
  packageManager: 'npm',
  action: 'test',
  description: 'Run npm test script',
  mutatesWorkspace: false,
  parser: parseNpmOutput,
  argsDescription: 'Additional arguments passed to the test script',
});
