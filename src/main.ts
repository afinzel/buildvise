#!/usr/bin/env node
/**
 * Buildvise CLI entry point
 */

import { createStorage } from './storage/index.js';
import {
  createPluginRegistry,
  dotnetBuildPlugin,
  dotnetTestPlugin,
  npmInstallPlugin,
  npmBuildPlugin,
  npmTestPlugin,
  npmRunPlugin,
  pnpmInstallPlugin,
  pnpmBuildPlugin,
  pnpmTestPlugin,
  pnpmRunPlugin,
  eslintLintPlugin,
} from './plugins/index.js';
import { createCli, parseArgs } from './cli.js';

const storage = createStorage();
storage.cleanup();

const registry = createPluginRegistry();
registry.register(dotnetBuildPlugin);
registry.register(dotnetTestPlugin);
registry.register(npmInstallPlugin);
registry.register(npmBuildPlugin);
registry.register(npmTestPlugin);
registry.register(npmRunPlugin);
registry.register(pnpmInstallPlugin);
registry.register(pnpmBuildPlugin);
registry.register(pnpmTestPlugin);
registry.register(pnpmRunPlugin);
registry.register(eslintLintPlugin);

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
  process.stdout.write(JSON.stringify({ error: String(error) }) + '\n');
});
