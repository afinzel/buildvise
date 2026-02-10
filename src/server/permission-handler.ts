/**
 * Permission handler for mutating operations
 */

import type { Plugin } from '../plugins/index.js';
import type { ConfirmationRequest } from './permission-types.js';

export interface PermissionCheckInput {
  plugin: Plugin;
  args: string[];
  cwd: string;
  confirmed?: boolean;
}

export interface PermissionCheckResult {
  allowed: boolean;
  confirmationRequest?: ConfirmationRequest;
}

export function checkPermission(input: PermissionCheckInput): PermissionCheckResult {
  const { plugin, args, cwd, confirmed } = input;

  if (!plugin.mutatesWorkspace) {
    return { allowed: true };
  }

  if (confirmed === true) {
    return { allowed: true };
  }

  return {
    allowed: false,
    confirmationRequest: {
      confirmationRequired: true,
      tool: plugin.name,
      description: plugin.description,
      args,
      cwd,
    },
  };
}
