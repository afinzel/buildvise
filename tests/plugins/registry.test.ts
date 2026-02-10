import { describe, it, expect } from 'vitest';
import { createPluginRegistry } from '../../src/plugins/registry.js';
import type { Plugin, PluginInput, PluginOutput } from '../../src/plugins/types.js';

function createMockPlugin(name: string, mutates = false): Plugin {
  return {
    name,
    description: `Mock plugin ${name}`,
    mutatesWorkspace: mutates,
    inputSchema: { type: 'object' },
    async execute(_input: PluginInput): Promise<PluginOutput> {
      return { success: true, diagnostics: [], exitCode: 0 };
    },
  };
}

describe('createPluginRegistry', () => {
  describe('register', () => {
    it('registers a plugin', () => {
      const registry = createPluginRegistry();
      const plugin = createMockPlugin('test.plugin');

      registry.register(plugin);

      expect(registry.get('test.plugin')).toBe(plugin);
    });

    it('throws when registering duplicate plugin', () => {
      const registry = createPluginRegistry();
      const plugin = createMockPlugin('test.plugin');

      registry.register(plugin);

      expect(() => registry.register(plugin)).toThrow(
        'Plugin "test.plugin" is already registered'
      );
    });
  });

  describe('get', () => {
    it('returns undefined for unregistered plugin', () => {
      const registry = createPluginRegistry();

      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('returns registered plugin by name', () => {
      const registry = createPluginRegistry();
      const plugin = createMockPlugin('dotnet.build');

      registry.register(plugin);

      expect(registry.get('dotnet.build')).toBe(plugin);
    });
  });

  describe('list', () => {
    it('returns empty array when no plugins registered', () => {
      const registry = createPluginRegistry();

      expect(registry.list()).toEqual([]);
    });

    it('returns all registered plugins', () => {
      const registry = createPluginRegistry();
      const plugin1 = createMockPlugin('dotnet.build');
      const plugin2 = createMockPlugin('npm.install', true);

      registry.register(plugin1);
      registry.register(plugin2);

      const plugins = registry.list();
      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
    });
  });
});
