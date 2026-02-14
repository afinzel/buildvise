/**
 * npm.install plugin
 */

import { createPackageManagerPlugin } from '../package-manager/factory.js';
import { parseNpmOutput } from './parse-npm.js';

export const npmInstallPlugin = createPackageManagerPlugin({
  packageManager: 'npm',
  action: 'install',
  description: 'Install npm packages',
  mutatesWorkspace: true,
  parser: parseNpmOutput,
  argsDescription: 'Arguments passed to npm install (e.g. package names, --save-dev)',
});
