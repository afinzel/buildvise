import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupOldRuns } from '../../src/storage/cleanup.js';
import type { RunMeta } from '../../src/types/index.js';

const TEST_DIR = '/tmp/buildvise-cleanup-test';

const OLD_RUN_ID = '00000000-0000-4000-a000-000000000001';
const RECENT_RUN_ID = '00000000-0000-4000-a000-000000000002';
const NO_META_RUN_ID = '00000000-0000-4000-a000-000000000003';

describe('cleanupOldRuns', () => {
  beforeEach(() => {
    process.env.XDG_DATA_HOME = TEST_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(join(TEST_DIR, 'buildvise/runs'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.XDG_DATA_HOME;
  });

  function createTestRun(runId: string, completedAt: Date): void {
    const runDir = join(TEST_DIR, 'buildvise/runs', runId);
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
    rmSync(join(TEST_DIR, 'buildvise/runs'), { recursive: true, force: true });
    expect(cleanupOldRuns()).toBe(0);
  });

  it('removes runs older than 14 days', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 15);
    createTestRun(OLD_RUN_ID, oldDate);

    const removed = cleanupOldRuns();

    expect(removed).toBe(1);
    expect(existsSync(join(TEST_DIR, 'buildvise/runs', OLD_RUN_ID))).toBe(false);
  });

  it('keeps runs within 14 days', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    createTestRun(RECENT_RUN_ID, recentDate);

    const removed = cleanupOldRuns();

    expect(removed).toBe(0);
    expect(existsSync(join(TEST_DIR, 'buildvise/runs', RECENT_RUN_ID))).toBe(true);
  });

  it('handles mixed old and recent runs', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20);
    createTestRun(OLD_RUN_ID, oldDate);

    const recentDate = new Date();
    createTestRun(RECENT_RUN_ID, recentDate);

    const removed = cleanupOldRuns();

    expect(removed).toBe(1);
    expect(existsSync(join(TEST_DIR, 'buildvise/runs', OLD_RUN_ID))).toBe(false);
    expect(existsSync(join(TEST_DIR, 'buildvise/runs', RECENT_RUN_ID))).toBe(true);
  });

  it('skips directories without meta.json', () => {
    mkdirSync(join(TEST_DIR, 'buildvise/runs', NO_META_RUN_ID), { recursive: true });

    const removed = cleanupOldRuns();

    expect(removed).toBe(0);
    expect(existsSync(join(TEST_DIR, 'buildvise/runs', NO_META_RUN_ID))).toBe(true);
  });

  it('skips directories with non-UUID names', () => {
    const invalidDir = join(TEST_DIR, 'buildvise/runs/not-a-uuid');
    mkdirSync(invalidDir, { recursive: true });

    const removed = cleanupOldRuns();

    expect(removed).toBe(0);
    expect(existsSync(invalidDir)).toBe(true);
  });
});
