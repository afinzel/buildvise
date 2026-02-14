/**
 * Security validation utilities
 */

import { realpathSync } from 'node:fs';
import path from 'node:path';

const ALLOWED_SHELLS = new Set([
  '/bin/sh',
  '/bin/bash',
  '/bin/zsh',
  '/bin/dash',
  '/usr/bin/bash',
  '/usr/bin/zsh',
]);

const SENSITIVE_DIRS = new Set([
  '/etc',
  '/usr',
  '/bin',
  '/sbin',
  '/var',
  '/System',
  '/boot',
  '/dev',
  '/proc',
  '/sys',
  '/root',
]);

const SCRIPT_NAME_REGEX = /^[a-zA-Z0-9_:@/.-]+$/;

const DANGEROUS_ESLINT_FLAGS = new Set([
  '--config',
  '-c',
  '--rulesdir',
  '--plugin',
  '--resolve-plugins-relative-to',
]);

export function validateShellPath(shell: string | undefined): string {
  if (shell && ALLOWED_SHELLS.has(shell)) {
    return shell;
  }
  return '/bin/sh';
}

export function validateCwd(
  resolvedCwd: string,
  originalCwd: string | undefined,
  defaultCwd: string
): void {
  let realPath: string;
  try {
    realPath = realpathSync(resolvedCwd);
  } catch {
    throw new Error(`Working directory does not exist: ${resolvedCwd}`);
  }

  for (const dir of SENSITIVE_DIRS) {
    let resolvedDir: string;
    try {
      resolvedDir = realpathSync(dir);
    } catch {
      resolvedDir = dir;
    }
    if (realPath === resolvedDir || realPath.startsWith(resolvedDir + '/')) {
      throw new Error(`Working directory is in a sensitive system path: ${realPath}`);
    }
  }

  if (originalCwd && !path.isAbsolute(originalCwd)) {
    let realDefault: string;
    try {
      realDefault = realpathSync(defaultCwd);
    } catch {
      realDefault = path.resolve(defaultCwd);
    }
    if (!realPath.startsWith(realDefault + '/') && realPath !== realDefault) {
      throw new Error(
        `Relative working directory resolves outside default: ${realPath}`
      );
    }
  }
}

export function validateScriptName(name: string): void {
  if (!name) {
    throw new Error('Script name must not be empty');
  }
  if (!SCRIPT_NAME_REGEX.test(name)) {
    throw new Error(
      `Invalid script name: ${name}. Only alphanumeric, _, :, @, /, ., - characters are allowed.`
    );
  }
}

export function validateEslintArgs(args: string[]): void {
  for (const arg of args) {
    if (DANGEROUS_ESLINT_FLAGS.has(arg)) {
      throw new Error(
        `Blocked ESLint flag: ${arg}. This flag can load arbitrary code.`
      );
    }
  }
}

export function validateRunFilename(
  filename: string,
  allowed: Set<string>
): void {
  if (filename.includes('/') || filename.includes('\\')) {
    throw new Error(`Invalid filename: path separators not allowed: ${filename}`);
  }
  if (!allowed.has(filename)) {
    throw new Error(`Unknown run file: ${filename}`);
  }
}
