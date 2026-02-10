/**
 * Main storage API implementation
 */

import { readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import type { RunMeta } from '../types/index.js';
import type { StorageAPI, RunWriter, RunReader } from './types.js';
import { getRunsDir, getRunFile, RUN_FILES } from './paths.js';
import { createRunWriter } from './run-writer.js';
import { createRunReader } from './run-reader.js';
import { cleanupOldRuns } from './cleanup.js';

export function createStorage(): StorageAPI {
  const runsDir = getRunsDir();
  mkdirSync(runsDir, { recursive: true });

  return {
    createRun(tool: string, cwd: string, command: string[]): RunWriter {
      return createRunWriter(tool, cwd, command);
    },

    getRun(runId: string): RunReader | null {
      return createRunReader(runId);
    },

    listRuns(): RunMeta[] {
      if (!existsSync(runsDir)) {
        return [];
      }

      const entries = readdirSync(runsDir, { withFileTypes: true });
      const runs: RunMeta[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const runId = entry.name;
        const metaPath = getRunFile(runId, RUN_FILES.META);

        if (!existsSync(metaPath)) {
          continue;
        }

        try {
          const meta: RunMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));
          runs.push(meta);
        } catch {
          // Skip malformed meta files
        }
      }

      return runs.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    },

    cleanup(): void {
      cleanupOldRuns();
    },
  };
}
