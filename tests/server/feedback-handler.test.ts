/**
 * Tests for feedback handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFeedbackHandler } from '../../src/server/feedback-handler.js';

// Mock child_process.execFile
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';

const mockExecFile = vi.mocked(execFile);

describe('createFeedbackHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleReportIssue', () => {
    it('returns issue URL on success', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, 'https://github.com/afinzel/buildvise/issues/42\n', '');
        return undefined as any;
      });

      const handler = createFeedbackHandler();
      const result = await handler.handleReportIssue({
        title: 'Test issue',
        body: 'Test body',
      });

      expect(result).toEqual({
        success: true,
        issueUrl: 'https://github.com/afinzel/buildvise/issues/42',
      });

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['issue', 'create', '--repo', 'afinzel/buildvise', '--title', 'Test issue', '--body', 'Test body', '--label', 'enhancement'],
        expect.objectContaining({ timeout: 30_000 }),
        expect.any(Function),
      );
    });

    it('defaults category to enhancement', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, 'https://github.com/afinzel/buildvise/issues/1\n', '');
        return undefined as any;
      });

      const handler = createFeedbackHandler();
      await handler.handleReportIssue({ title: 'Title', body: 'Body' });

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['--label', 'enhancement']),
        expect.anything(),
        expect.any(Function),
      );
    });

    it('uses bug label when category is bug', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, 'https://github.com/afinzel/buildvise/issues/2\n', '');
        return undefined as any;
      });

      const handler = createFeedbackHandler();
      await handler.handleReportIssue({ title: 'Bug', body: 'Details', category: 'bug' });

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['--label', 'bug']),
        expect.anything(),
        expect.any(Function),
      );
    });

    it('returns error when gh is not installed', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const error = Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' });
        (callback as Function)(error, '', '');
        return undefined as any;
      });

      const handler = createFeedbackHandler();
      const result = await handler.handleReportIssue({ title: 'Title', body: 'Body' });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('GitHub CLI (gh) is not installed'),
      });
    });

    it('returns stderr on non-zero exit', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const error = new Error('exit code 1');
        (callback as Function)(error, '', 'HTTP 401: Bad credentials');
        return undefined as any;
      });

      const handler = createFeedbackHandler();
      const result = await handler.handleReportIssue({ title: 'Title', body: 'Body' });

      expect(result).toEqual({
        success: false,
        error: 'HTTP 401: Bad credentials',
      });
    });

    it('returns error when title is empty', async () => {
      const handler = createFeedbackHandler();
      const result = await handler.handleReportIssue({ title: '', body: 'Body' });

      expect(result).toEqual({
        success: false,
        error: 'Both title and body are required',
      });
    });

    it('returns error when body is empty', async () => {
      const handler = createFeedbackHandler();
      const result = await handler.handleReportIssue({ title: 'Title', body: '' });

      expect(result).toEqual({
        success: false,
        error: 'Both title and body are required',
      });
    });
  });
});
