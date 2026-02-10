import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupOldRuns } from '../../src/storage/cleanup.js';
import type { RunMeta } from '../../src/types/index.js';

const TEST_DIR = '/tmp/mcp-build-cleanup-test';

describe('cleanupOldRuns', () => {
  beforeEach(() => {
    process.env.XDG_DATA_HOME = TEST_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(join(TEST_DIR, 'mcp-build/runs'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.XDG_DATA_HOME;
  });

  function createTestRun(runId: string, completedAt: Date): void {
    const runDir = join(TEST_DIR, 'mcp-build/runs', runId);
    mkdirSync(runDir, { recursive: true });

    const meta: RunMeta = {
      runId,
      tool: 'test',
      startedAt: completedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      exitCode: 0,
      cwd: '/test',
      command: ['test'],
    };

    writeFileSync(join(runDir, 'meta.json'), JSON.stringify(meta));
  }

  it('returns 0 when no runs directory exists', () => {
    rmSync(join(TEST_DIR, 'mcp-build/runs'), { recursive: true, force: true });
    expect(cleanupOldRuns()).toBe(0);
  });

  it('removes runs older than 14 days', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 15);
    createTestRun('old-run', oldDate);

    const removed = cleanupOldRuns();

    expect(removed).toBe(1);
    expect(existsSync(join(TEST_DIR, 'mcp-build/runs/old-run'))).toBe(false);
  });

  it('keeps runs within 14 days', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    createTestRun('recent-run', recentDate);

    const removed = cleanupOldRuns();

    expect(removed).toBe(0);
    expect(existsSync(join(TEST_DIR, 'mcp-build/runs/recent-run'))).toBe(true);
  });

  it('handles mixed old and recent runs', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20);
    createTestRun('old-run', oldDate);

    const recentDate = new Date();
    createTestRun('recent-run', recentDate);

    const removed = cleanupOldRuns();

    expect(removed).toBe(1);
    expect(existsSync(join(TEST_DIR, 'mcp-build/runs/old-run'))).toBe(false);
    expect(existsSync(join(TEST_DIR, 'mcp-build/runs/recent-run'))).toBe(true);
  });

  it('skips directories without meta.json', () => {
    mkdirSync(join(TEST_DIR, 'mcp-build/runs/no-meta'), { recursive: true });

    const removed = cleanupOldRuns();

    expect(removed).toBe(0);
    expect(existsSync(join(TEST_DIR, 'mcp-build/runs/no-meta'))).toBe(true);
  });
});
