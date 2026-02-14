/**
 * npm.run plugin
 */

import { createPackageManagerPlugin } from '../package-manager/factory.js';
import { parseNpmOutput } from './parse-npm.js';

export const npmRunPlugin = createPackageManagerPlugin({
  packageManager: 'npm',
  action: 'run',
  description: 'Run npm scripts',
  mutatesWorkspace: true,
  parser: parseNpmOutput,
  argsDescription: 'Arguments: first is script name, rest are passed after -- to the script',
});
