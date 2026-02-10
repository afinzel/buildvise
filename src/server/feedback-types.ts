/**
 * Feedback tool types
 */

export interface ReportIssueInput {
  title: string;
  body: string;
  category?: 'bug' | 'enhancement' | 'question';
}

export type ReportIssueResult =
  | { success: true; issueUrl: string }
  | { success: false; error: string };
