/**
 * CLI interface for buildvise
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  createSuccessResponse,
  createErrorResponse,
  createDiagnostic,
  type ToolResponse,
} from './types/index.js';
import type { PluginRegistry } from './plugins/index.js';
import type { StorageAPI } from './storage/index.js';
import { isValidRunId, clamp, MAX_RAW_BYTE_LENGTH, MAX_LOG_LINE_COUNT } from './utils/validation.js';

const DEFAULT_BYTE_LENGTH = 4096;
const DEFAULT_LINE_COUNT = 50;

export interface CliDependencies {
  registry: PluginRegistry;
  storage: StorageAPI;
  defaultCwd: string;
}

export interface CliEarlyExit {
  kind: 'exit';
  output: string;
  exitCode: number;
}

export interface CliCommand {
  kind: 'command';
  command: string;
  args: ParsedArgs;
}

export function createCli(deps: CliDependencies) {
  const { registry, storage, defaultCwd } = deps;

  async function exec(toolName: string, cwd: string | undefined, args: string[]): Promise<ToolResponse> {
    const plugin = registry.get(toolName);

    if (!plugin) {
      return createErrorResponse('', [
        createDiagnostic({
          tool: toolName,
          severity: 'error',
          message: `Unknown tool: ${toolName}`,
          code: 'UNKNOWN_TOOL',
        }),
      ]);
    }

    const rawCwd = cwd ?? defaultCwd;
    const resolvedCwd = path.isAbsolute(rawCwd) ? rawCwd : path.resolve(defaultCwd, rawCwd);

    if (!existsSync(resolvedCwd)) {
      return createErrorResponse('', [
        createDiagnostic({
          tool: plugin.name,
          severity: 'error',
          message: `Working directory does not exist: ${resolvedCwd}`,
          code: 'INVALID_CWD',
        }),
      ]);
    }

    const command = [plugin.name.split('.')[0], ...args];
    const runWriter = storage.createRun(plugin.name, resolvedCwd, command);

    try {
      const output = await plugin.execute({
        args,
        cwd: resolvedCwd,
        runWriter,
      });

      runWriter.writeDiagnostics(output.diagnostics);
      runWriter.complete(output.exitCode);

      const errors = output.diagnostics.filter((d) => d.severity === 'error');
      const warnings = output.diagnostics.filter((d) => d.severity === 'warning');
      const options = output.summary ? { summary: output.summary } : {};

      if (output.success) {
        return createSuccessResponse(runWriter.runId, warnings, options);
      } else {
        return createErrorResponse(runWriter.runId, errors, warnings, options);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      runWriter.complete(1);

      return createErrorResponse(runWriter.runId, [
        createDiagnostic({
          tool: plugin.name,
          severity: 'error',
          message: `Execution failed: ${message}`,
          code: 'EXECUTION_ERROR',
        }),
      ]);
    }
  }

  function list(): { tools: Array<{ name: string; description: string }> } {
    const tools = registry.list().map((p) => ({
      name: p.name,
      description: p.description,
    }));
    return { tools };
  }

  function raw(runId: string, offset?: number, length?: number): object {
    if (!isValidRunId(runId)) {
      return { error: `Invalid runId: ${runId}`, code: 'INVALID_RUN_ID' };
    }

    const resolvedOffset = Math.max(0, offset ?? 0);
    const resolvedLength = clamp(length ?? DEFAULT_BYTE_LENGTH, 1, MAX_RAW_BYTE_LENGTH);

    const reader = storage.getRun(runId);
    if (!reader) {
      return { error: `Run not found: ${runId}`, code: 'RUN_NOT_FOUND' };
    }

    const index = reader.getLogIndex();
    const bytes = reader.getLogBytes(resolvedOffset, resolvedLength);
    const actualLength = bytes.length;

    return {
      data: bytes.toString('utf-8'),
      offset: resolvedOffset,
      length: actualLength,
      totalBytes: index.totalBytes,
      hasMore: resolvedOffset + actualLength < index.totalBytes,
    };
  }

  function logRange(runId: string, startLine: number, lineCount?: number): object {
    if (!isValidRunId(runId)) {
      return { error: `Invalid runId: ${runId}`, code: 'INVALID_RUN_ID' };
    }

    const resolvedCount = clamp(lineCount ?? DEFAULT_LINE_COUNT, 1, MAX_LOG_LINE_COUNT);

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

    const lines = reader.getLogLines(startLine, resolvedCount);
    const endLine = startLine + lines.length - 1;

    return {
      lines,
      startLine,
      endLine,
      totalLines: index.totalLines,
      hasMore: endLine < index.totalLines,
    };
  }

  return { exec, list, raw, logRange };
}

export type ParseResult = CliEarlyExit | CliCommand;

export function parseArgs(argv: string[]): ParseResult {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return {
      kind: 'exit',
      output: USAGE,
      exitCode: 0,
    };
  }

  const command = args[0];

  switch (command) {
    case 'exec':
      return { kind: 'command', command: 'exec', args: parseExecArgs(args.slice(1)) };
    case 'list':
      return { kind: 'command', command: 'list', args: { tool: '', cwd: undefined, extraArgs: [], startLine: 0, offset: undefined, length: undefined, lineCount: undefined, runId: '' } };
    case 'raw':
      return { kind: 'command', command: 'raw', args: parseRawArgs(args.slice(1)) };
    case 'log-range':
      return { kind: 'command', command: 'log-range', args: parseLogRangeArgs(args.slice(1)) };
    default:
      return {
        kind: 'exit',
        output: JSON.stringify({ error: `Unknown command: ${command}` }),
        exitCode: 1,
      };
  }
}

export interface ParsedArgs {
  tool: string;
  cwd: string | undefined;
  extraArgs: string[];
  runId: string;
  offset: number | undefined;
  length: number | undefined;
  startLine: number;
  lineCount: number | undefined;
}

function parseExecArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    tool: '',
    cwd: undefined,
    extraArgs: [],
    runId: '',
    offset: undefined,
    length: undefined,
    startLine: 0,
    lineCount: undefined,
  };

  let i = 0;
  const doubleDashIndex = args.indexOf('--');
  const flagArgs = doubleDashIndex >= 0 ? args.slice(0, doubleDashIndex) : args;

  for (i = 0; i < flagArgs.length; i++) {
    if (flagArgs[i] === '--cwd' && i + 1 < flagArgs.length) {
      result.cwd = flagArgs[++i];
    } else if (!result.tool) {
      result.tool = flagArgs[i];
    }
  }

  if (doubleDashIndex >= 0) {
    result.extraArgs = args.slice(doubleDashIndex + 1);
  }

  return result;
}

function parseRawArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    tool: '',
    cwd: undefined,
    extraArgs: [],
    runId: '',
    offset: undefined,
    length: undefined,
    startLine: 0,
    lineCount: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--offset' && i + 1 < args.length) {
      result.offset = parseInt(args[++i], 10);
    } else if (args[i] === '--length' && i + 1 < args.length) {
      result.length = parseInt(args[++i], 10);
    } else if (!result.runId) {
      result.runId = args[i];
    }
  }

  return result;
}

function parseLogRangeArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    tool: '',
    cwd: undefined,
    extraArgs: [],
    runId: '',
    offset: undefined,
    length: undefined,
    startLine: 1,
    lineCount: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && i + 1 < args.length) {
      result.startLine = parseInt(args[++i], 10);
    } else if (args[i] === '--count' && i + 1 < args.length) {
      result.lineCount = parseInt(args[++i], 10);
    } else if (!result.runId) {
      result.runId = args[i];
    }
  }

  return result;
}

const USAGE = `Usage: buildvise <command> [options]

Commands:
  exec <tool> [--cwd <dir>] [-- <args...>]   Run a build/test/lint tool
  list                                         List available tools
  raw <runId> [--offset N] [--length N]        Get raw bytes from a run
  log-range <runId> [--start N] [--count N]    Get log lines from a run

Examples:
  buildvise exec npm.build --cwd /path/to/project
  buildvise exec npm.test --cwd /path/to/project -- --coverage
  buildvise list
  buildvise log-range abc123 --start 1 --count 20`;
