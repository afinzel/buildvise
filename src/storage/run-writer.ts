/**
 * RunWriter implementation for capturing run output
 */

import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Diagnostic, RunMeta } from '../types/index.js';
import type { RunWriter, LogIndex, LineEntry } from './types.js';
import { getRunDir, getRunFile, RUN_FILES } from './paths.js';

export function createRunWriter(
  tool: string,
  cwd: string,
  command: string[]
): RunWriter {
  const runId = randomUUID();
  const runDir = getRunDir(runId);
  const startedAt = new Date().toISOString();

  mkdirSync(runDir, { recursive: true, mode: 0o700 });

  const logPath = getRunFile(runId, RUN_FILES.RAW_LOG);
  writeFileSync(logPath, '', { mode: 0o600 });

  const index: LogIndex = {
    lines: [],
    totalLines: 0,
    totalBytes: 0,
  };

  let currentLineBuffer = Buffer.alloc(0);

  function processChunk(chunk: Buffer): void {
    let position = 0;

    while (position < chunk.length) {
      const newlineIndex = chunk.indexOf(0x0a, position); // '\n'

      if (newlineIndex === -1) {
        currentLineBuffer = Buffer.concat([
          currentLineBuffer,
          chunk.subarray(position),
        ]);
        break;
      }

      const lineContent = Buffer.concat([
        currentLineBuffer,
        chunk.subarray(position, newlineIndex + 1),
      ]);

      const entry: LineEntry = {
        line: index.totalLines + 1,
        byteOffset: index.totalBytes,
        byteLength: lineContent.length,
      };

      index.lines.push(entry);
      index.totalLines++;
      index.totalBytes += lineContent.length;

      currentLineBuffer = Buffer.alloc(0);
      position = newlineIndex + 1;
    }
  }

  function flushRemainingBuffer(): void {
    if (currentLineBuffer.length > 0) {
      const entry: LineEntry = {
        line: index.totalLines + 1,
        byteOffset: index.totalBytes,
        byteLength: currentLineBuffer.length,
      };

      index.lines.push(entry);
      index.totalLines++;
      index.totalBytes += currentLineBuffer.length;
      currentLineBuffer = Buffer.alloc(0);
    }
  }

  return {
    runId,

    appendLog(chunk: Buffer): void {
      appendFileSync(logPath, chunk);
      processChunk(chunk);
    },

    writeDiagnostics(diagnostics: Diagnostic[]): void {
      const path = getRunFile(runId, RUN_FILES.DIAGNOSTICS);
      writeFileSync(path, JSON.stringify(diagnostics, null, 2), { mode: 0o600 });
    },

    complete(exitCode: number): void {
      flushRemainingBuffer();

      const indexPath = getRunFile(runId, RUN_FILES.RAW_INDEX);
      writeFileSync(indexPath, JSON.stringify(index, null, 2), { mode: 0o600 });

      const meta: RunMeta = {
        runId,
        tool,
        startedAt,
        completedAt: new Date().toISOString(),
        exitCode,
        cwd,
        command,
      };

      const metaPath = getRunFile(runId, RUN_FILES.META);
      writeFileSync(metaPath, JSON.stringify(meta, null, 2), { mode: 0o600 });
    },
  };
}
