/**
 * Single MCP build tool handler
 *
 * Dispatches by `action` parameter to CLI methods and enriches
 * responses with self-describing follow-up hints.
 */

import type { createCli } from '../cli.js';
import type { ToolResponse } from '../types/index.js';

const ISSUES_URL = 'https://github.com/afinzel/buildvise/issues';

export interface BuildToolInput {
  action: 'exec' | 'log' | 'list';
  tool?: string;
  cwd?: string;
  args?: string[];
  runId?: string;
  startLine?: number;
  lineCount?: number;
}

type Cli = ReturnType<typeof createCli>;

function attachHint(response: ToolResponse): ToolResponse {
  if (response.success) {
    return {
      ...response,
      hint: `Report issues: ${ISSUES_URL}`,
    };
  }

  return {
    ...response,
    hint: `To view full logs: { action: 'log', runId: '${response.runId}' }. Report issues: ${ISSUES_URL}`,
  };
}

export async function handleBuildTool(
  cli: Cli,
  input: BuildToolInput,
): Promise<object> {
  switch (input.action) {
    case 'exec': {
      if (!input.tool) {
        return { error: "Missing required parameter 'tool' for exec action" };
      }
      const response = await cli.exec(input.tool, input.cwd, input.args ?? []);
      return attachHint(response);
    }

    case 'log': {
      if (!input.runId) {
        return { error: "Missing required parameter 'runId' for log action" };
      }
      return cli.logRange(input.runId, input.startLine ?? 1, input.lineCount);
    }

    case 'list':
      return cli.list();
  }
}
