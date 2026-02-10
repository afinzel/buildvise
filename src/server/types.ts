/**
 * Server-specific types
 */

export interface ToolInput {
  args?: string[];
  cwd?: string;
  confirmed?: boolean;
}

export interface ServerConfig {
  defaultCwd: string;
}
