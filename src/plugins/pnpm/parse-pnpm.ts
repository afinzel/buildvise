/**
 * Parser for pnpm output
 */

import { createPackageManagerParser } from '../package-manager/parse-pm-output.js';

const PNPM_WARN_REGEX = /^\s*WARN\s+(\w+)?\s*(.+)$/;
const PNPM_ERROR_REGEX = /^\s*ERR_PNPM_(\w+)\s+(.+)$/;

export const parsePnpmOutput = createPackageManagerParser({
  warnRegex: PNPM_WARN_REGEX,
  errorRegex: PNPM_ERROR_REGEX,
});
