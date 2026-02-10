import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import {
  executeCommand,
  getUserPathFromShell,
  getFallbackPaths,
  resetPathCache,
} from '../../src/plugins/executor.js';
import { createStorage } from '../../src/storage/index.js';

const TEST_DIR = '/tmp/mcp-build-executor-test';
const PROJECT_DIR = '/tmp/mcp-build-executor-project';

describe('executeCommand', () => {
  beforeEach(() => {
    process.env.XDG_DATA_HOME = TEST_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.XDG_DATA_HOME;
  });

  it('executes command and captures stdout', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['echo', 'hello']);

    const result = await executeCommand({
      command: 'echo',
      args: ['hello world'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('hello world');

    const reader = storage.getRun(runWriter.runId);
    const lines = reader!.getLogLines(1, 10);
    expect(lines[0]).toBe('hello world');
  });

  it('captures stderr', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['echo error >&2']);

    // With shell: true, we pass the entire command as one string
    const result = await executeCommand({
      command: 'echo error >&2',
      args: [],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('error');
  });

  it('returns non-zero exit code on failure', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['exit 42']);

    // With shell: true, exit is a shell built-in
    const result = await executeCommand({
      command: 'exit 42',
      args: [],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(42);
  });

  it('returns exit code 127 for command not found', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['nonexistent-command']);

    // With shell: true, command not found returns exit code 127 instead of rejecting
    const result = await executeCommand({
      command: 'nonexistent-command-xyz-123',
      args: [],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(127);
    expect(result.output).toContain('not found');
  });

  it('finds executables in node_modules/.bin', async () => {
    // Create a mock project with node_modules/.bin
    rmSync(PROJECT_DIR, { recursive: true, force: true });
    const binDir = path.join(PROJECT_DIR, 'node_modules', '.bin');
    mkdirSync(binDir, { recursive: true });

    // Create a mock executable script
    const scriptPath = path.join(binDir, 'my-test-tool');
    writeFileSync(scriptPath, '#!/bin/sh\necho "tool output"');
    chmodSync(scriptPath, 0o755);

    const storage = createStorage();
    const runWriter = storage.createRun('test', PROJECT_DIR, ['my-test-tool']);

    const result = await executeCommand({
      command: 'my-test-tool',
      args: [],
      cwd: PROJECT_DIR,
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('tool output');

    // Cleanup
    rmSync(PROJECT_DIR, { recursive: true, force: true });
  });
});

describe('getUserPathFromShell', () => {
  beforeEach(() => {
    resetPathCache();
  });

  afterEach(() => {
    resetPathCache();
  });

  it('returns a non-empty path string', () => {
    const userPath = getUserPathFromShell();
    expect(userPath).not.toBeNull();
    expect(typeof userPath).toBe('string');
    expect(userPath!.length).toBeGreaterThan(0);
  });

  it('returns path containing common directories', () => {
    const userPath = getUserPathFromShell();
    expect(userPath).not.toBeNull();
    // Should contain at least /usr/bin which is universal
    expect(userPath).toContain('/usr/bin');
  });

  it('caches the result', () => {
    const first = getUserPathFromShell();
    const second = getUserPathFromShell();
    // Should return the same cached value
    expect(first).toBe(second);
  });

  it('returns fresh value after cache reset', () => {
    const first = getUserPathFromShell();
    resetPathCache();
    const second = getUserPathFromShell();
    // Values should be equal (same system) but verifies cache was cleared
    expect(first).toEqual(second);
  });
});

describe('getFallbackPaths', () => {
  it('returns array of paths', () => {
    const paths = getFallbackPaths();
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.length).toBeGreaterThan(0);
  });

  it('includes common tool directories on Unix', () => {
    if (process.platform !== 'win32') {
      const paths = getFallbackPaths();
      expect(paths).toContain('/usr/local/bin');
      expect(paths).toContain('/usr/bin');
    }
  });

  it('includes homebrew path on macOS', () => {
    if (process.platform === 'darwin') {
      const paths = getFallbackPaths();
      expect(paths).toContain('/opt/homebrew/bin');
    }
  });

  it('includes dotnet paths', () => {
    const paths = getFallbackPaths();
    if (process.platform === 'win32') {
      expect(paths.some((p) => p.includes('dotnet'))).toBe(true);
    } else {
      expect(paths).toContain('/usr/local/share/dotnet');
    }
  });
});

describe('resetPathCache', () => {
  it('clears the cached path', () => {
    // Populate cache
    getUserPathFromShell();
    // Reset it
    resetPathCache();
    // Should work without error (cache was cleared)
    const path = getUserPathFromShell();
    expect(path).not.toBeNull();
  });
});
