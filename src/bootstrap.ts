/**
 * Shared bootstrap for CLI and MCP server
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
import type { PluginRegistry } from './plugins/index.js';
import type { StorageAPI } from './storage/index.js';

export interface BootstrapResult {
  storage: StorageAPI;
  registry: PluginRegistry;
}

export function bootstrap(): BootstrapResult {
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

  return { storage, registry };
}
