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
import { MAX_IN_MEMORY_OUTPUT } from '../../src/utils/validation.js';

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
    const runWriter = storage.createRun('test', '/tmp', ['sh', '-c', 'echo error >&2']);

    const result = await executeCommand({
      command: 'sh',
      args: ['-c', 'echo error >&2'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('error');
  });

  it('returns non-zero exit code on failure', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['sh', '-c', 'exit 42']);

    const result = await executeCommand({
      command: 'sh',
      args: ['-c', 'exit 42'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(42);
  });

  it('rejects for command not found', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['nonexistent-command']);

    await expect(
      executeCommand({
        command: 'nonexistent-command-xyz-123',
        args: [],
        cwd: '/tmp',
        runWriter,
      })
    ).rejects.toThrow();
  });

  it('treats shell metacharacters in args as literals', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['echo', 'hello;rm -rf /']);

    const result = await executeCommand({
      command: 'echo',
      args: ['hello;rm -rf /'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('hello;rm -rf /');
  });

  it('truncates in-memory output exceeding MAX_IN_MEMORY_OUTPUT', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['dd']);

    const sizeMB = Math.ceil(MAX_IN_MEMORY_OUTPUT / (1024 * 1024)) + 2;
    const result = await executeCommand({
      command: 'dd',
      args: ['if=/dev/zero', `bs=1048576`, `count=${sizeMB}`],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.output).toContain('[output truncated: exceeded 10MB in-memory limit]');
    expect(Buffer.byteLength(result.output)).toBeLessThan(MAX_IN_MEMORY_OUTPUT + 1024);
  }, 30_000);

  it('does not truncate small output', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['echo', 'small']);

    const result = await executeCommand({
      command: 'echo',
      args: ['small output'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.output).toContain('small output');
    expect(result.output).not.toContain('[output truncated');
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
