/**
 * Storage cleanup - removes runs older than retention period
 */

import { readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import type { RunMeta } from '../types/index.js';
import { getRunsDir, getRunDir, getRunFile, RUN_FILES } from './paths.js';
import { isValidRunId } from '../utils/validation.js';

const RETENTION_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function cleanupOldRuns(): number {
  const runsDir = getRunsDir();

  if (!existsSync(runsDir)) {
    return 0;
  }

  const cutoffTime = Date.now() - RETENTION_DAYS * MS_PER_DAY;
  let removedCount = 0;

  const entries = readdirSync(runsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const runId = entry.name;

    if (!isValidRunId(runId)) {
      continue;
    }

    const metaPath = getRunFile(runId, RUN_FILES.META);

    if (!existsSync(metaPath)) {
      continue;
    }

    try {
      const meta: RunMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      const completedAt = new Date(meta.completedAt).getTime();

      if (completedAt < cutoffTime) {
        rmSync(getRunDir(runId), { recursive: true, force: true });
        removedCount++;
      }
    } catch {
      // Skip malformed meta files
    }
  }

  return removedCount;
}
