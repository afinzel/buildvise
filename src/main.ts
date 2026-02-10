#!/usr/bin/env node
/**
 * Buildvise MCP Server entry point
 */

import { createRequire } from 'node:module';
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
import { createMcpServer } from './server/index.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

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

const server = createMcpServer({
  name: 'buildvise',
  version: pkg.version,
  registry,
  storage,
  defaultCwd: process.cwd(),
});

server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
