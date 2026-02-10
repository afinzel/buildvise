import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDataHome,
  getStorageRoot,
  getRunsDir,
  getRunDir,
  getRunFile,
  RUN_FILES,
} from '../../src/storage/paths.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('paths', () => {
  const originalEnv = process.env.XDG_DATA_HOME;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = originalEnv;
    }
  });

  describe('getDataHome', () => {
    it('returns XDG_DATA_HOME when set', () => {
      process.env.XDG_DATA_HOME = '/custom/data';
      expect(getDataHome()).toBe('/custom/data');
    });

    it('returns default when XDG_DATA_HOME not set', () => {
      delete process.env.XDG_DATA_HOME;
      expect(getDataHome()).toBe(join(homedir(), '.local/share'));
    });
  });

  describe('getStorageRoot', () => {
    it('returns mcp-build directory under data home', () => {
      process.env.XDG_DATA_HOME = '/data';
      expect(getStorageRoot()).toBe('/data/mcp-build');
    });
  });

  describe('getRunsDir', () => {
    it('returns runs directory under storage root', () => {
      process.env.XDG_DATA_HOME = '/data';
      expect(getRunsDir()).toBe('/data/mcp-build/runs');
    });
  });

  describe('getRunDir', () => {
    it('returns directory for specific run', () => {
      process.env.XDG_DATA_HOME = '/data';
      expect(getRunDir('550e8400-e29b-41d4-a716-446655440000')).toBe(
        '/data/mcp-build/runs/550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('throws for path traversal attempt', () => {
      expect(() => getRunDir('../etc/passwd')).toThrow('Invalid runId');
      expect(() => getRunDir('../../etc/passwd')).toThrow('Invalid runId');
    });

    it('throws for non-UUID strings', () => {
      expect(() => getRunDir('abc-123')).toThrow('Invalid runId');
      expect(() => getRunDir('not-a-uuid')).toThrow('Invalid runId');
    });
  });

  describe('getRunFile', () => {
    it('returns file path within run directory', () => {
      process.env.XDG_DATA_HOME = '/data';
      expect(getRunFile('550e8400-e29b-41d4-a716-446655440000', 'raw.log')).toBe(
        '/data/mcp-build/runs/550e8400-e29b-41d4-a716-446655440000/raw.log'
      );
    });
  });

  describe('RUN_FILES', () => {
    it('defines all expected file names', () => {
      expect(RUN_FILES.RAW_LOG).toBe('raw.log');
      expect(RUN_FILES.RAW_INDEX).toBe('raw.index.json');
      expect(RUN_FILES.DIAGNOSTICS).toBe('diagnostics.json');
      expect(RUN_FILES.META).toBe('meta.json');
    });
  });
});
