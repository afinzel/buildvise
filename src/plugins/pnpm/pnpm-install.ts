/**
 * pnpm.install plugin
 */

import { createPackageManagerPlugin } from '../package-manager/factory.js';
import { parsePnpmOutput } from './parse-pnpm.js';

export const pnpmInstallPlugin = createPackageManagerPlugin({
  packageManager: 'pnpm',
  action: 'install',
  description: 'Install pnpm packages',
  mutatesWorkspace: true,
  parser: parsePnpmOutput,
  argsDescription: 'Arguments passed to pnpm install (e.g. package names, --save-dev)',
});
