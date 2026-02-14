/**
 * npm.build plugin
 */

import { createPackageManagerPlugin } from '../package-manager/factory.js';
import { parseNpmOutput } from './parse-npm.js';

export const npmBuildPlugin = createPackageManagerPlugin({
  packageManager: 'npm',
  action: 'build',
  description: 'Run npm build script',
  mutatesWorkspace: false,
  parser: parseNpmOutput,
  argsDescription: 'Additional arguments passed to the build script',
});
