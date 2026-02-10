/**
 * MCP Server implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { PluginRegistry } from '../plugins/index.js';
import type { StorageAPI } from '../storage/index.js';
import { createToolHandler } from './tool-handler.js';
import { createRawOutputHandler } from './raw-output-handler.js';
import type { ToolInput } from './types.js';
import type { RunRawInput, RunLogRangeInput } from './raw-output-types.js';
import { createFeedbackHandler } from './feedback-handler.js';
import type { ReportIssueInput } from './feedback-types.js';

export interface McpServerConfig {
  name: string;
  version: string;
  registry: PluginRegistry;
  storage: StorageAPI;
  defaultCwd: string;
}

export interface McpServer {
  start(): Promise<void>;
}

const RAW_OUTPUT_TOOLS = [
  {
    name: 'run.raw',
    description:
      'Get raw log output by byte offset. Use to get full stack traces from failed tests, ' +
      'or when the structured errors array is empty but success=false. ' +
      'Workflow: After dotnet_test/dotnet_build returns a failure, call run_raw with the runId to see complete error output. ' +
      'Note: Raw logs use significantly more tokens than structured diagnostics - only fetch when needed. ' +
      'Prefer this for initial debugging; use run_logRange to zoom into specific sections.',
    inputSchema: {
      type: 'object',
      properties: {
        runId: { type: 'string', description: 'Run ID from a previous tool call' },
        offset: { type: 'number', description: 'Byte offset to start reading (default: 0)' },
        length: { type: 'number', description: 'Number of bytes to read (default: 4096)' },
      },
      required: ['runId'],
    },
  },
  {
    name: 'run.logRange',
    description:
      'Get log lines by line number. Use when you need context around a specific line number from a diagnostic. ' +
      'Each diagnostic includes logRange.startLine - use this to fetch surrounding context. ' +
      'Prefer run_raw for initial debugging; use run_logRange to zoom into specific sections after identifying the area of interest.',
    inputSchema: {
      type: 'object',
      properties: {
        runId: { type: 'string', description: 'Run ID from a previous tool call' },
        startLine: { type: 'number', description: '1-indexed line number to start reading' },
        lineCount: { type: 'number', description: 'Number of lines to read (default: 50)' },
      },
      required: ['runId', 'startLine'],
    },
  },
];

const FEEDBACK_TOOL = {
  name: 'report_issue',
  description:
    'File a GitHub issue for Buildvise improvements or bugs encountered while using the tools. ' +
    'Always confirm with the user before calling. ' +
    'Do not include secrets, API keys, or PII.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short issue title' },
      body: { type: 'string', description: 'Detailed description of the issue' },
      category: {
        type: 'string',
        description: 'Category: bug, enhancement, or question',
        default: 'enhancement',
      },
    },
    required: ['title', 'body'],
  },
};

export function createMcpServer(config: McpServerConfig): McpServer {
  const { name, version, registry, storage, defaultCwd } = config;

  const server = new Server(
    { name, version },
    { capabilities: { tools: {} } }
  );

  const toolHandler = createToolHandler({ registry, storage, defaultCwd });
  const rawOutputHandler = createRawOutputHandler(storage);
  const feedbackHandler = createFeedbackHandler();

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const plugins = registry.list();

    const pluginTools = plugins.map((plugin) => ({
      name: plugin.name,
      description: plugin.description,
      inputSchema: plugin.inputSchema,
    }));

    return {
      tools: [...pluginTools, ...RAW_OUTPUT_TOOLS, FEEDBACK_TOOL],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: args } = request.params;
    const typedArgs = args as Record<string, unknown> | undefined;

    if (toolName === 'run.raw') {
      const input: RunRawInput = {
        runId: typedArgs?.runId as string,
        offset: typedArgs?.offset as number | undefined,
        length: typedArgs?.length as number | undefined,
      };
      const response = rawOutputHandler.handleRunRaw(input);
      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
      };
    }

    if (toolName === 'report_issue') {
      const input: ReportIssueInput = {
        title: typedArgs?.title as string,
        body: typedArgs?.body as string,
        category: typedArgs?.category as ReportIssueInput['category'],
      };
      const response = await feedbackHandler.handleReportIssue(input);
      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
      };
    }

    if (toolName === 'run.logRange') {
      const input: RunLogRangeInput = {
        runId: typedArgs?.runId as string,
        startLine: typedArgs?.startLine as number,
        lineCount: typedArgs?.lineCount as number | undefined,
      };
      const response = rawOutputHandler.handleRunLogRange(input);
      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
      };
    }

    const input: ToolInput = {
      args: typedArgs?.args as string[] | undefined,
      cwd: typedArgs?.cwd as string | undefined,
      confirmed: typedArgs?.confirmed as boolean | undefined,
    };

    const response = await toolHandler.handleToolCall(toolName, input);

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
  });

  return {
    async start(): Promise<void> {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}
