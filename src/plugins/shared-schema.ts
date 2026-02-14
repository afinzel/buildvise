/**
 * Shared input schema builder for plugins
 */

import type { JSONSchema } from './types.js';

export function buildInputSchema(
  argsDescription: string,
  options: { includeConfirmed?: boolean } = {}
): JSONSchema {
  const { includeConfirmed = true } = options;

  const properties: Record<string, JSONSchema> = {
    args: {
      type: 'array',
      items: { type: 'string' },
      description: argsDescription,
    },
    cwd: {
      type: 'string',
      description: 'Working directory',
    },
  };

  if (includeConfirmed) {
    properties.confirmed = {
      type: 'boolean',
      description: 'Confirmation for mutating operations',
    };
  }

  return { type: 'object', properties };
}
