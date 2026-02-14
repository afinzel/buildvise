/**
 * Plugin types and interfaces
 */

import type { Diagnostic, TestSummary } from '../types/index.js';
import type { RunWriter } from '../storage/index.js';

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  description?: string;
  default?: unknown;
}

export interface PluginInput {
  args: string[];
  cwd: string;
  runWriter: RunWriter;
}

export interface PluginOutput {
  success: boolean;
  diagnostics: Diagnostic[];
  exitCode: number;
  summary?: TestSummary;
}

export interface Plugin {
  /** Unique identifier (e.g. "dotnet.build") */
  readonly name: string;
  /** Human-readable description for tool discovery */
  readonly description: string;
  /** Whether this plugin modifies the workspace */
  readonly mutatesWorkspace: boolean;
  /** JSON Schema for input validation */
  readonly inputSchema: JSONSchema;
  /** Execute the plugin */
  execute(input: PluginInput): Promise<PluginOutput>;
}

export interface PluginRegistry {
  register(plugin: Plugin): void;
  get(name: string): Plugin | undefined;
  list(): Plugin[];
}
