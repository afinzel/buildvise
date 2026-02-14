/**
 * pnpm.build plugin
 */

import { createPackageManagerPlugin } from '../package-manager/factory.js';
import { parsePnpmOutput } from './parse-pnpm.js';

export const pnpmBuildPlugin = createPackageManagerPlugin({
  packageManager: 'pnpm',
  action: 'build',
  description: 'Run pnpm build script',
  mutatesWorkspace: false,
  parser: parsePnpmOutput,
  argsDescription: 'Additional arguments passed to the build script',
});
