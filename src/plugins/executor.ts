/**
 * Command execution utilities for plugins
 */

import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import type { RunWriter } from '../storage/index.js';

export interface ExecuteCommandOptions {
  command: string;
  args: string[];
  cwd: string;
  runWriter: RunWriter;
}

export interface ExecuteCommandResult {
  exitCode: number;
  output: string;
}

let cachedUserPath: string | null = null;

/** Reset cached PATH - exported for testing */
export function resetPathCache(): void {
  cachedUserPath = null;
}

export function getUserPathFromShell(): string | null {
  if (cachedUserPath !== null) {
    return cachedUserPath;
  }

  if (process.platform === 'win32') {
    // On Windows, try to get PATH from cmd
    try {
      const result = spawnSync('cmd', ['/c', 'echo %PATH%'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      if (result.status === 0 && result.stdout) {
        cachedUserPath = result.stdout.trim();
        return cachedUserPath;
      }
    } catch {
      // Fall through to return null
    }
    return null;
  }

  // macOS/Linux: get PATH from user's login shell
  const shell = process.env['SHELL'] ?? '/bin/sh';
  try {
    const result = spawnSync(shell, ['-l', '-c', 'echo $PATH'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    if (result.status === 0 && result.stdout) {
      cachedUserPath = result.stdout.trim();
      return cachedUserPath;
    }
  } catch {
    // Fall through to return null
  }
  return null;
}

export function getFallbackPaths(): string[] {
  if (process.platform === 'win32') {
    const appData = process.env['APPDATA'] ?? '';
    const programFiles = process.env['ProgramFiles'] ?? 'C:\\Program Files';
    return [
      ...(appData ? [path.join(appData, 'npm')] : []),
      path.join(programFiles, 'dotnet'),
    ];
  }
  return [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/local/share/dotnet',
    '/usr/share/dotnet',
    '/usr/bin',
  ];
}

function buildEnvWithNodeModulesBin(cwd: string): NodeJS.ProcessEnv {
  const nodeModulesBin = path.join(cwd, 'node_modules', '.bin');
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  const currentPath = process.env['PATH'] ?? '';

  // Try to get user's full PATH from their login shell
  const userPath = getUserPathFromShell();

  let finalPath: string;
  if (userPath) {
    // Merge: node_modules/.bin + user shell PATH + current process PATH
    finalPath = [nodeModulesBin, userPath, currentPath]
      .filter(Boolean)
      .join(pathSeparator);
  } else {
    // Fallback to hardcoded common paths + current process PATH
    const fallbackPaths = getFallbackPaths();
    finalPath = [nodeModulesBin, ...fallbackPaths, currentPath]
      .filter(Boolean)
      .join(pathSeparator);
  }

  return {
    ...process.env,
    PATH: finalPath,
  };
}

export function executeCommand(
  options: ExecuteCommandOptions
): Promise<ExecuteCommandResult> {
  const { command, args, cwd, runWriter } = options;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const child = spawn(command, args, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: buildEnvWithNodeModulesBin(cwd),
    });

    child.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      runWriter.appendLog(chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      runWriter.appendLog(chunk);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      const output = Buffer.concat(chunks).toString('utf-8');
      resolve({ exitCode: code ?? 1, output });
    });
  });
}
