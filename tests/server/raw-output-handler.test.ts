import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { createRawOutputHandler } from '../../src/server/raw-output-handler.js';
import { createStorage } from '../../src/storage/index.js';

const TEST_DIR = '/tmp/mcp-build-raw-output-test';

describe('createRawOutputHandler', () => {
  beforeEach(() => {
    process.env.XDG_DATA_HOME = TEST_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.XDG_DATA_HOME;
  });

  describe('handleRunRaw', () => {
    it('returns error for non-existent run', () => {
      const storage = createStorage();
      const handler = createRawOutputHandler(storage);

      const result = handler.handleRunRaw({ runId: 'non-existent' });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.code).toBe('RUN_NOT_FOUND');
      }
    });

    it('returns raw bytes from start', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);
      writer.appendLog(Buffer.from('hello world\n'));
      writer.complete(0);

      const handler = createRawOutputHandler(storage);
      const result = handler.handleRunRaw({ runId: writer.runId });

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data).toBe('hello world\n');
        expect(result.offset).toBe(0);
        expect(result.totalBytes).toBe(12);
        expect(result.hasMore).toBe(false);
      }
    });

    it('returns bytes from offset', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);
      writer.appendLog(Buffer.from('hello world\n'));
      writer.complete(0);

      const handler = createRawOutputHandler(storage);
      const result = handler.handleRunRaw({ runId: writer.runId, offset: 6 });

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data).toBe('world\n');
        expect(result.offset).toBe(6);
      }
    });

    it('respects length parameter', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);
      writer.appendLog(Buffer.from('hello world\n'));
      writer.complete(0);

      const handler = createRawOutputHandler(storage);
      const result = handler.handleRunRaw({
        runId: writer.runId,
        offset: 0,
        length: 5,
      });

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data).toBe('hello');
        expect(result.length).toBe(5);
        expect(result.hasMore).toBe(true);
      }
    });

    it('indicates hasMore when more data available', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);
      writer.appendLog(Buffer.from('line 1\nline 2\nline 3\n'));
      writer.complete(0);

      const handler = createRawOutputHandler(storage);
      const result = handler.handleRunRaw({
        runId: writer.runId,
        offset: 0,
        length: 7,
      });

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.hasMore).toBe(true);
      }
    });
  });

  describe('handleRunLogRange', () => {
    it('returns error for non-existent run', () => {
      const storage = createStorage();
      const handler = createRawOutputHandler(storage);

      const result = handler.handleRunLogRange({
        runId: 'non-existent',
        startLine: 1,
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.code).toBe('RUN_NOT_FOUND');
      }
    });

    it('returns error for invalid startLine', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);
      writer.appendLog(Buffer.from('line 1\n'));
      writer.complete(0);

      const handler = createRawOutputHandler(storage);
      const result = handler.handleRunLogRange({
        runId: writer.runId,
        startLine: 0,
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.code).toBe('INVALID_START_LINE');
      }
    });

    it('returns lines from start', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);
      writer.appendLog(Buffer.from('line 1\nline 2\nline 3\n'));
      writer.complete(0);

      const handler = createRawOutputHandler(storage);
      const result = handler.handleRunLogRange({
        runId: writer.runId,
        startLine: 1,
      });

      expect('lines' in result).toBe(true);
      if ('lines' in result) {
        expect(result.lines).toEqual(['line 1', 'line 2', 'line 3']);
        expect(result.startLine).toBe(1);
        expect(result.endLine).toBe(3);
        expect(result.totalLines).toBe(3);
        expect(result.hasMore).toBe(false);
      }
    });

    it('returns lines from middle', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);
      writer.appendLog(Buffer.from('line 1\nline 2\nline 3\n'));
      writer.complete(0);

      const handler = createRawOutputHandler(storage);
      const result = handler.handleRunLogRange({
        runId: writer.runId,
        startLine: 2,
        lineCount: 1,
      });

      expect('lines' in result).toBe(true);
      if ('lines' in result) {
        expect(result.lines).toEqual(['line 2']);
        expect(result.startLine).toBe(2);
        expect(result.endLine).toBe(2);
        expect(result.hasMore).toBe(true);
      }
    });

    it('returns empty array when startLine beyond total', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);
      writer.appendLog(Buffer.from('line 1\n'));
      writer.complete(0);

      const handler = createRawOutputHandler(storage);
      const result = handler.handleRunLogRange({
        runId: writer.runId,
        startLine: 100,
      });

      expect('lines' in result).toBe(true);
      if ('lines' in result) {
        expect(result.lines).toEqual([]);
        expect(result.hasMore).toBe(false);
      }
    });

    it('indicates hasMore when more lines available', () => {
      const storage = createStorage();
      const writer = storage.createRun('test', '/tmp', ['test']);
      writer.appendLog(Buffer.from('line 1\nline 2\nline 3\n'));
      writer.complete(0);

      const handler = createRawOutputHandler(storage);
      const result = handler.handleRunLogRange({
        runId: writer.runId,
        startLine: 1,
        lineCount: 2,
      });

      expect('lines' in result).toBe(true);
      if ('lines' in result) {
        expect(result.lines).toHaveLength(2);
        expect(result.hasMore).toBe(true);
      }
    });
  });
});
