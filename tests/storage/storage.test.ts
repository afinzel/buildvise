import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createStorage } from '../../src/storage/storage.js';
import { createDiagnostic } from '../../src/types/index.js';

const TEST_DIR = '/tmp/mcp-build-test';

describe('storage', () => {
  beforeEach(() => {
    process.env.XDG_DATA_HOME = TEST_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.XDG_DATA_HOME;
  });

  describe('createStorage', () => {
    it('creates runs directory on initialization', () => {
      createStorage();
      expect(existsSync(join(TEST_DIR, 'mcp-build/runs'))).toBe(true);
    });
  });

  describe('createRun', () => {
    it('creates a new run with unique ID', () => {
      const storage = createStorage();
      const writer = storage.createRun('dotnet.build', '/project', [
        'dotnet',
        'build',
      ]);

      expect(writer.runId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('creates run directory', () => {
      const storage = createStorage();
      const writer = storage.createRun('dotnet.build', '/project', [
        'dotnet',
        'build',
      ]);

      const runDir = join(TEST_DIR, 'mcp-build/runs', writer.runId);
      expect(existsSync(runDir)).toBe(true);
    });
  });

  describe('RunWriter', () => {
    it('appends log data', () => {
      const storage = createStorage();
      const writer = storage.createRun('dotnet.build', '/project', [
        'dotnet',
        'build',
      ]);

      writer.appendLog(Buffer.from('line 1\n'));
      writer.appendLog(Buffer.from('line 2\n'));
      writer.complete(0);

      const reader = storage.getRun(writer.runId);
      expect(reader).not.toBeNull();
      expect(reader!.getLogLines(1, 2)).toEqual(['line 1', 'line 2']);
    });

    it('writes diagnostics', () => {
      const storage = createStorage();
      const writer = storage.createRun('dotnet.build', '/project', [
        'dotnet',
        'build',
      ]);

      const diagnostic = createDiagnostic({
        tool: 'dotnet.build',
        severity: 'error',
        message: 'Test error',
      });

      writer.writeDiagnostics([diagnostic]);
      writer.complete(1);

      const reader = storage.getRun(writer.runId);
      expect(reader!.getDiagnostics()).toHaveLength(1);
      expect(reader!.getDiagnostics()[0].message).toBe('Test error');
    });

    it('writes meta on complete', () => {
      const storage = createStorage();
      const writer = storage.createRun('npm.install', '/app', [
        'npm',
        'install',
      ]);

      writer.complete(0);

      const reader = storage.getRun(writer.runId);
      expect(reader!.meta.tool).toBe('npm.install');
      expect(reader!.meta.cwd).toBe('/app');
      expect(reader!.meta.command).toEqual(['npm', 'install']);
      expect(reader!.meta.exitCode).toBe(0);
    });
  });

  describe('RunReader', () => {
    it('returns null for non-existent run', () => {
      const storage = createStorage();
      expect(storage.getRun('non-existent')).toBeNull();
    });

    it('reads log bytes by offset', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);

      writer.appendLog(Buffer.from('hello world\n'));
      writer.complete(0);

      const reader = storage.getRun(writer.runId)!;
      const bytes = reader.getLogBytes(0, 5);
      expect(bytes.toString()).toBe('hello');
    });

    it('handles partial line reads', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);

      writer.appendLog(Buffer.from('abc'));
      writer.appendLog(Buffer.from('def\n'));
      writer.complete(0);

      const reader = storage.getRun(writer.runId)!;
      expect(reader.getLogLines(1, 1)).toEqual(['abcdef']);
    });
  });

  describe('listRuns', () => {
    it('returns empty array when no runs', () => {
      const storage = createStorage();
      expect(storage.listRuns()).toEqual([]);
    });

    it('returns all runs sorted by start time descending', () => {
      const storage = createStorage();

      const writer1 = storage.createRun('tool1', '/a', ['cmd1']);
      writer1.complete(0);

      const writer2 = storage.createRun('tool2', '/b', ['cmd2']);
      writer2.complete(0);

      const runs = storage.listRuns();
      expect(runs).toHaveLength(2);
      expect(runs[0].tool).toBe('tool2');
      expect(runs[1].tool).toBe('tool1');
    });
  });
});
