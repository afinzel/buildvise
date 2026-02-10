/**
 * Feedback handler - provides report_issue tool
 */

import { execFile } from 'node:child_process';
import type { ReportIssueInput, ReportIssueResult } from './feedback-types.js';

const REPO = 'afinzel/buildvise';

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'bug',
  enhancement: 'enhancement',
  question: 'question',
};

export interface FeedbackHandler {
  handleReportIssue(input: ReportIssueInput): Promise<ReportIssueResult>;
}

export function createFeedbackHandler(): FeedbackHandler {
  return {
    async handleReportIssue(input: ReportIssueInput): Promise<ReportIssueResult> {
      const { title, body, category = 'enhancement' } = input;

      if (!title || !body) {
        return { success: false, error: 'Both title and body are required' };
      }

      const label = CATEGORY_LABELS[category] ?? 'enhancement';
      const args = [
        'issue', 'create',
        '--repo', REPO,
        '--title', title,
        '--body', body,
        '--label', label,
      ];

      return new Promise<ReportIssueResult>((resolve) => {
        execFile('gh', args, { timeout: 30_000 }, (error, stdout, stderr) => {
          if (error) {
            if ('code' in error && error.code === 'ENOENT') {
              resolve({
                success: false,
                error: 'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/',
              });
              return;
            }
            resolve({
              success: false,
              error: stderr.trim() || error.message,
            });
            return;
          }

          const issueUrl = stdout.trim();
          if (!issueUrl) {
            resolve({ success: false, error: 'No issue URL returned from gh' });
            return;
          }

          resolve({ success: true, issueUrl });
        });
      });
    },
  };
}
