/**
 * Run metadata types
 */

export interface RunMeta {
  /** Unique run identifier */
  runId: string;
  /** Tool that was executed (e.g. "dotnet.build") */
  tool: string;
  /** ISO 8601 timestamp when run started */
  startedAt: string;
  /** ISO 8601 timestamp when run completed */
  completedAt: string;
  /** Process exit code */
  exitCode: number;
  /** Working directory */
  cwd: string;
  /** Full command array that was executed */
  command: string[];
}
