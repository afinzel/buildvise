/**
 * MCP stdio server entry point
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { bootstrap } from './bootstrap.js';
import { createCli } from './cli.js';
import { handleBuildTool } from './mcp/build-tool.js';

export async function startMcpServer(): Promise<void> {
  const { storage, registry } = bootstrap();

  const cli = createCli({
    registry,
    storage,
    defaultCwd: process.cwd(),
  });

  const server = new McpServer(
    { name: 'buildvise', version: '0.2.0' },
    {
      instructions:
        'Build, test, lint, and manage packages. Use action "exec" to run tools, "log" to view logs, "list" to see available tools.',
    },
  );

  server.registerTool(
    'build',
    {
      title: 'Buildvise',
      description:
        'Build, test, lint, or manage packages. Returns structured JSON diagnostics with 10-50x token reduction vs raw output.',
      inputSchema: z.object({
        action: z.enum(['exec', 'log', 'list']).describe(
          'exec: run a build/test/lint tool. log: view log lines from a previous run. list: show available tools.',
        ),
        tool: z
          .string()
          .optional()
          .describe('Tool to run (required for exec). e.g. npm.build, npm.test, pnpm.install, eslint.lint'),
        cwd: z.string().optional().describe('Working directory (for exec). Defaults to server cwd.'),
        args: z.array(z.string()).optional().describe('Extra arguments passed to the tool (for exec).'),
        runId: z.string().optional().describe('Run ID from a previous exec (required for log).'),
        startLine: z.number().optional().describe('Start line for log output (defaults to 1).'),
        lineCount: z.number().optional().describe('Number of log lines to return.'),
      }),
    },
    async (input) => {
      const result = await handleBuildTool(cli, input);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
