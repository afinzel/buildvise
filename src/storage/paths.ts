/**
 * Storage path utilities following XDG Base Directory spec
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { validateRunId } from '../utils/validation.js';

const XDG_DATA_HOME_DEFAULT = '.local/share';
const APP_NAME = 'mcp-build';
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

export function getRunFile(runId: string, filename: string): string {
  return join(getRunDir(runId), filename);
}

export const RUN_FILES = {
  RAW_LOG: 'raw.log',
  RAW_INDEX: 'raw.index.json',
  DIAGNOSTICS: 'diagnostics.json',
  META: 'meta.json',
} as const;
