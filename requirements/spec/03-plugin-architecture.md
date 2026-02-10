# Plugin Architecture

The internal plugin contract and lifecycle.

---

## Plugin Interface

```typescript
interface Plugin {
  name: string;              // e.g. "dotnet.build"
  description: string;       // for MCP tool discovery
  mutatesWorkspace: boolean;
  inputSchema: JSONSchema;
  execute(input: PluginInput): Promise<PluginOutput>;
}

interface PluginInput {
  args: string[];
  cwd: string;
  runWriter: RunWriter;      // from storage module
}

interface PluginOutput {
  success: boolean;
  diagnostics: Diagnostic[];
  exitCode: number;
}
```

---

## Plugin Responsibilities

1. **Command execution** - what shell command(s) to run
2. **Flag ownership** - validate and pass through args
3. **Log parsing** - extract structured diagnostics
4. **Success semantics** - interpret exit codes
5. **Diagnostic emission** - using schema from `01-core-types.md`

---

## Naming Convention

Plugins named by **tool**, not language:

`dotnet.build`, `dotnet.test`, `npm.install`, `pnpm.install`, `bun.install`, `eslint.lint`

---

## Mutation Declaration

Mutating operations declare `mutatesWorkspace = true`:
- `npm.install`, `pnpm.install`, `bun.install` - modify `node_modules/`

Non-mutating:
- `dotnet.build`, `dotnet.test`, `eslint.lint` - read-only or build artifacts only

---

## Plugin Registry

```typescript
interface PluginRegistry {
  register(plugin: Plugin): void;
  get(name: string): Plugin | undefined;
  list(): Plugin[];
}
```

For v1, all plugins are built-in modules.

---

## Execution Flow

1. MCP tool call received
2. Plugin looked up by name
3. If `mutatesWorkspace`, confirmation required (see `06-permissions.md`)
4. `RunWriter` created via storage module
5. Plugin `execute()` called
6. Output captured to `raw.log` with indexing
7. Plugin parses output, emits diagnostics
8. Run completed, response returned

---

## Cross-References

- Diagnostic type: see `01-core-types.md`
- Storage/RunWriter: see `02-storage.md`
- MCP tool mapping: see `04-mcp-tools.md`
- Permissions: see `06-permissions.md`
- Individual plugins: see `07-plugins/`
