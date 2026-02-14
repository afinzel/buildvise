/**
 * pnpm.run plugin
 */

import { createPackageManagerPlugin } from '../package-manager/factory.js';
import { parsePnpmOutput } from './parse-pnpm.js';

export const pnpmRunPlugin = createPackageManagerPlugin({
  packageManager: 'pnpm',
  action: 'run',
  description: 'Run pnpm scripts',
  mutatesWorkspace: true,
  parser: parsePnpmOutput,
  argsDescription: 'Arguments: first is script name, rest are passed after -- to the script',
});
