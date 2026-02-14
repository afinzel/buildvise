/**
 * Diagnostic types for build/test/lint output
 */

export type Severity = 'error' | 'warning' | 'info';

export interface LogRange {
  /** 1-indexed start line (0 if not available) */
  startLine: number;
  /** 1-indexed end line (0 if not available) */
  endLine: number;
}

export interface ByteOffsets {
  /** Byte offset from start of log (0 if not available) */
  start: number;
  /** Byte offset end position (0 if not available) */
  end: number;
}

export interface Diagnostic {
  /** Plugin that produced this diagnostic (e.g. "dotnet.build") */
  tool: string;
  /** Severity level */
  severity: Severity;
  /** Human-readable error/warning message */
  message: string;
  /** Error code from the tool (e.g. "CS0103", "ERESOLVE") */
  code?: string;
  /** Source file path (absolute or workspace-relative) */
  file?: string;
  /** 1-indexed line number in source file */
  line?: number;
  /** 1-indexed column number in source file */
  column?: number;
  /** Reference to lines in raw log output */
  logRange: LogRange;
  /** Reference to byte range in raw log output */
  byteOffsets: ByteOffsets;
}

/**
 * Create a diagnostic with default log references
 */
export function createDiagnostic(
  partial: Omit<Diagnostic, 'logRange' | 'byteOffsets'> & {
    logRange?: Partial<LogRange>;
    byteOffsets?: Partial<ByteOffsets>;
  }
): Diagnostic {
  return {
    ...partial,
    logRange: {
      startLine: partial.logRange?.startLine ?? 0,
      endLine: partial.logRange?.endLine ?? 0,
    },
    byteOffsets: {
      start: partial.byteOffsets?.start ?? 0,
      end: partial.byteOffsets?.end ?? 0,
    },
  };
}
