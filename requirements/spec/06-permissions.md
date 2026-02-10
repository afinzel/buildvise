# Permissions

Safety and confirmation flows for workspace-mutating operations.

---

## Mutation Declaration

Plugins declare: `mutatesWorkspace: boolean`

**Mutating:** `npm.install`, `pnpm.install`, `bun.install`

**Non-mutating:** `dotnet.build`, `dotnet.test`, `eslint.lint`

---

## Confirmation Protocol

When `mutatesWorkspace = true`:

1. Tool call received
2. Server returns confirmation request:
   ```json
   { "confirmation_required": true, "tool": "npm.install",
     "args": ["typescript"], "cwd": "/path/to/project" }
   ```
3. Agent must explicitly confirm
4. On confirmation, execution proceeds
5. Without confirmation, returns error

---

## Implementation

```typescript
async function executeWithPermission(plugin: Plugin, input: PluginInput): Promise<ToolResponse> {
  if (plugin.mutatesWorkspace) {
    const confirmed = await requestConfirmation({
      tool: plugin.name, args: input.args, cwd: input.cwd
    });
    if (!confirmed) {
      return {
        success: false,
        errors: [{ tool: plugin.name, severity: 'error',
          message: 'Operation cancelled: confirmation required',
          logRange: { startLine: 0, endLine: 0 },
          byteOffsets: { start: 0, end: 0 } }],
        warnings: [], summary: { errorCount: 1, warningCount: 0 }, runId: ''
      };
    }
  }
  return plugin.execute(input);
}
```

---

## Agent Responsibility

Agents must: recognize confirmation requests, present mutation details to user, explicitly confirm, handle cancellation.

---

## Non-Goals (v1)

Per-project settings, operation allowlisting, persistent grants, user preferences.

---

## Cross-References

- Plugin interface: see `03-plugin-architecture.md`
- Response shape: see `01-core-types.md`
