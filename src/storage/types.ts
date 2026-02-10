/**
 * Storage-specific types
 */

import type { Diagnostic, RunMeta } from '../types/index.js';

export interface LineEntry {
  /** 1-indexed line number */
  line: number;
  /** Byte position in raw.log */
  byteOffset: number;
  /** Length of this line in bytes */
  byteLength: number;
}

export interface LogIndex {
  lines: LineEntry[];
  totalLines: number;
  totalBytes: number;
}

export interface RunWriter {
  readonly runId: string;
  appendLog(chunk: Buffer): void;
  writeDiagnostics(diagnostics: Diagnostic[]): void;
  complete(exitCode: number): void;
}

export interface RunReader {
  readonly meta: RunMeta;
  getDiagnostics(): Diagnostic[];
  getLogBytes(start: number, length: number): Buffer;
  getLogLines(startLine: number, count: number): string[];
  getLogIndex(): LogIndex;
}

export interface StorageAPI {
  createRun(tool: string, cwd: string, command: string[]): RunWriter;
  getRun(runId: string): RunReader | null;
  listRuns(): RunMeta[];
  cleanup(): void;
}
