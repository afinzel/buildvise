/**
 * RunReader implementation for accessing run data
 */

import { readFileSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import type { Diagnostic, RunMeta } from '../types/index.js';
import type { RunReader, LogIndex } from './types.js';
import { getRunDir, getRunFile, RUN_FILES } from './paths.js';

export function createRunReader(runId: string): RunReader | null {
  const runDir = getRunDir(runId);

  if (!existsSync(runDir)) {
    return null;
  }

  const metaPath = getRunFile(runId, RUN_FILES.META);
  if (!existsSync(metaPath)) {
    return null;
  }

  const meta: RunMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));

  function loadIndex(): LogIndex {
    const indexPath = getRunFile(runId, RUN_FILES.RAW_INDEX);
    if (!existsSync(indexPath)) {
      return { lines: [], totalLines: 0, totalBytes: 0 };
    }
    return JSON.parse(readFileSync(indexPath, 'utf-8'));
  }

  return {
    meta,

    getDiagnostics(): Diagnostic[] {
      const path = getRunFile(runId, RUN_FILES.DIAGNOSTICS);
      if (!existsSync(path)) {
        return [];
      }
      return JSON.parse(readFileSync(path, 'utf-8'));
    },

    getLogBytes(start: number, length: number): Buffer {
      const logPath = getRunFile(runId, RUN_FILES.RAW_LOG);
      if (!existsSync(logPath)) {
        return Buffer.alloc(0);
      }

      const fd = openSync(logPath, 'r');
      try {
        const buffer = Buffer.alloc(length);
        const bytesRead = readSync(fd, buffer, 0, length, start);
        return buffer.subarray(0, bytesRead);
      } finally {
        closeSync(fd);
      }
    },

    getLogIndex(): LogIndex {
      return loadIndex();
    },

    getLogLines(startLine: number, count: number): string[] {
      const index = loadIndex();
      const logPath = getRunFile(runId, RUN_FILES.RAW_LOG);

      if (!existsSync(logPath) || index.lines.length === 0) {
        return [];
      }

      const startIdx = startLine - 1;
      if (startIdx < 0 || startIdx >= index.lines.length) {
        return [];
      }

      const endIdx = Math.min(startIdx + count, index.lines.length);
      const linesToRead = index.lines.slice(startIdx, endIdx);

      if (linesToRead.length === 0) {
        return [];
      }

      const firstLine = linesToRead[0];
      const lastLine = linesToRead[linesToRead.length - 1];
      const totalBytesToRead =
        lastLine.byteOffset + lastLine.byteLength - firstLine.byteOffset;

      const fd = openSync(logPath, 'r');
      try {
        const buffer = Buffer.alloc(totalBytesToRead);
        readSync(fd, buffer, 0, totalBytesToRead, firstLine.byteOffset);

        const lines: string[] = [];
        let offset = 0;

        for (const entry of linesToRead) {
          const lineBytes = buffer.subarray(offset, offset + entry.byteLength);
          let lineStr = lineBytes.toString('utf-8');
          if (lineStr.endsWith('\n')) {
            lineStr = lineStr.slice(0, -1);
          }
          lines.push(lineStr);
          offset += entry.byteLength;
        }

        return lines;
      } finally {
        closeSync(fd);
      }
    },
  };
}
