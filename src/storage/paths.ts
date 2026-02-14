/**
 * Storage path utilities following XDG Base Directory spec
 */

import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { validateRunId } from '../utils/validation.js';
import { validateRunFilename } from '../utils/security.js';

const XDG_DATA_HOME_DEFAULT = '.local/share';
const APP_NAME = 'buildvise';
const RUNS_DIR = 'runs';

export function getDataHome(): string {
  return process.env.XDG_DATA_HOME || join(homedir(), XDG_DATA_HOME_DEFAULT);
}

export function getStorageRoot(): string {
  return join(getDataHome(), APP_NAME);
}

export function getRunsDir(): string {
  return join(getStorageRoot(), RUNS_DIR);
}

export function getRunDir(runId: string): string {
  validateRunId(runId);
  return join(getRunsDir(), runId);
}

export const RUN_FILES = {
  RAW_LOG: 'raw.log',
  RAW_INDEX: 'raw.index.json',
  DIAGNOSTICS: 'diagnostics.json',
  META: 'meta.json',
} as const;

const ALLOWED_RUN_FILES = new Set(Object.values(RUN_FILES));

export function getRunFile(runId: string, filename: string): string {
  validateRunFilename(filename, ALLOWED_RUN_FILES);
  const runDir = getRunDir(runId);
  const filePath = join(runDir, filename);
  const resolvedDir = resolve(runDir);
  const resolvedFile = resolve(filePath);
  if (!resolvedFile.startsWith(resolvedDir + sep) && resolvedFile !== resolvedDir) {
    throw new Error('Path traversal detected');
  }
  return filePath;
}
