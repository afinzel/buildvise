#!/usr/bin/env node
/**
 * Buildvise CLI entry point
 */

import { bootstrap } from './bootstrap.js';
import { createCli, parseArgs } from './cli.js';

if (process.argv[2] === 'mcp') {
  const { startMcpServer } = await import('./mcp-server.js');
  await startMcpServer();
} else {
  const { storage, registry } = bootstrap();

  const cli = createCli({
    registry,
    storage,
    defaultCwd: process.cwd(),
  });

  async function run(): Promise<void> {
    const parsed = parseArgs(process.argv);

    if (parsed.kind === 'exit') {
      process.stdout.write(parsed.output + '\n');
      return;
    }

    let result: object;

    switch (parsed.command) {
      case 'exec':
        result = await cli.exec(parsed.args.tool, parsed.args.cwd, parsed.args.extraArgs);
        break;
      case 'list':
        result = cli.list();
        break;
      case 'raw':
        result = cli.raw(parsed.args.runId, parsed.args.offset, parsed.args.length);
        break;
      case 'log-range':
        result = cli.logRange(parsed.args.runId, parsed.args.startLine, parsed.args.lineCount);
        break;
      default:
        result = { error: `Unknown command: ${parsed.command}` };
    }

    process.stdout.write(JSON.stringify(result) + '\n');
  }

  run().catch((error) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    process.stdout.write(JSON.stringify({ error: message }) + '\n');
  });
}
