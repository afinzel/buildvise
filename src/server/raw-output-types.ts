/**
 * Raw output API types
 */

export interface RunRawInput {
  runId: string;
  offset?: number;
  length?: number;
}

export interface RunRawOutput {
  data: string;
  offset: number;
  length: number;
  totalBytes: number;
  hasMore: boolean;
}

export interface RunLogRangeInput {
  runId: string;
  startLine: number;
  lineCount?: number;
}

export interface RunLogRangeOutput {
  lines: string[];
  startLine: number;
  endLine: number;
  totalLines: number;
  hasMore: boolean;
}

export interface RunRawError {
  error: string;
  code: string;
}

export type RunRawResult = RunRawOutput | RunRawError;
export type RunLogRangeResult = RunLogRangeOutput | RunRawError;
