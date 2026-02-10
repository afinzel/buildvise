/**
 * Test summary types
 */

export interface TestSummary {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  /** Number of test projects that failed to build */
  projectsBuildFailed?: number;
}
