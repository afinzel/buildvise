/**
 * Parser for npm output
 */

import { createPackageManagerParser } from '../package-manager/parse-pm-output.js';

const NPM_WARN_REGEX = /^npm warn\s+(\w+)?\s*(.*)$/;
const NPM_ERROR_REGEX = /^npm error\s+(?:code\s+)?(\w+)?\s*(.*)$/;

export const parseNpmOutput = createPackageManagerParser({
  warnRegex: NPM_WARN_REGEX,
  errorRegex: NPM_ERROR_REGEX,
});
