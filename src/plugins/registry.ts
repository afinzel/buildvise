/**
 * Plugin registry implementation
 */

import type { Plugin, PluginRegistry } from './types.js';

export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, Plugin>();

  return {
    register(plugin: Plugin): void {
      if (plugins.has(plugin.name)) {
        throw new Error(`Plugin "${plugin.name}" is already registered`);
      }
      plugins.set(plugin.name, plugin);
    },

    get(name: string): Plugin | undefined {
      return plugins.get(name);
    },

    list(): Plugin[] {
      return Array.from(plugins.values());
    },
  };
}
