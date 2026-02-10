/**
 * Raw output handler - provides run.raw and run.logRange tools
 */

import type { StorageAPI } from '../storage/index.js';
import type {
  RunRawInput,
  RunRawResult,
  RunLogRangeInput,
  RunLogRangeResult,
} from './raw-output-types.js';

const DEFAULT_BYTE_LENGTH = 4096;
const DEFAULT_LINE_COUNT = 50;

export interface RawOutputHandler {
  handleRunRaw(input: RunRawInput): RunRawResult;
  handleRunLogRange(input: RunLogRangeInput): RunLogRangeResult;
}

export function createRawOutputHandler(storage: StorageAPI): RawOutputHandler {
  return {
    handleRunRaw(input: RunRawInput): RunRawResult {
      const { runId, offset = 0, length = DEFAULT_BYTE_LENGTH } = input;

      const reader = storage.getRun(runId);
      if (!reader) {
        return { error: `Run not found: ${runId}`, code: 'RUN_NOT_FOUND' };
      }

      const index = reader.getLogIndex();
      const bytes = reader.getLogBytes(offset, length);
      const actualLength = bytes.length;

      return {
        data: bytes.toString('utf-8'),
        offset,
        length: actualLength,
        totalBytes: index.totalBytes,
        hasMore: offset + actualLength < index.totalBytes,
      };
    },

    handleRunLogRange(input: RunLogRangeInput): RunLogRangeResult {
      const { runId, startLine, lineCount = DEFAULT_LINE_COUNT } = input;

      const reader = storage.getRun(runId);
      if (!reader) {
        return { error: `Run not found: ${runId}`, code: 'RUN_NOT_FOUND' };
      }

      const index = reader.getLogIndex();

      if (startLine < 1) {
        return { error: 'startLine must be >= 1', code: 'INVALID_START_LINE' };
      }

      if (startLine > index.totalLines) {
        return {
          lines: [],
          startLine,
          endLine: startLine - 1,
          totalLines: index.totalLines,
          hasMore: false,
        };
      }

      const lines = reader.getLogLines(startLine, lineCount);
      const endLine = startLine + lines.length - 1;

      return {
        lines,
        startLine,
        endLine,
        totalLines: index.totalLines,
        hasMore: endLine < index.totalLines,
      };
    },
  };
}
