# Core Types

All shared types and interfaces used across the MCP Build Tools Server.

---

## Severity Enum

```typescript
type Severity = 'error' | 'warning' | 'info';
```

---

## Diagnostic Schema

Each diagnostic emitted by a plugin:

```typescript
interface Diagnostic {
  tool: string;           // e.g. "dotnet.build", "eslint.lint"
  severity: Severity;
  message: string;
  code?: string;          // compiler/linter error code if available
  file?: string;          // absolute or workspace-relative path
  line?: number;          // 1-indexed
  column?: number;        // 1-indexed
  logRange: {
    startLine: number;    // 0 if not available
    endLine: number;      // 0 if not available
  };
  byteOffsets: {
    start: number;        // 0 if not available
    end: number;          // 0 if not available
  };
}
```

**Note:** `logRange` and `byteOffsets` are always present. Set to `0` values when the plugin cannot determine them.

---

## Response Shape

All tool responses follow this structure:

```typescript
interface ToolResponse {
  success: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
  runId: string;          // for raw output retrieval
  summary?: TestSummary;  // present for test plugins only
}
```

---

## Test Summary

Test plugins (`dotnet.test`, `npm.test`, `pnpm.test`) include a summary of test results:

```typescript
interface TestSummary {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  projectsBuildFailed?: number;  // count of test projects that failed to compile
}
```

**Note:** When running tests across multiple projects (e.g., a solution or monorepo), counts are aggregated. The `projectsBuildFailed` field indicates how many test projects failed to build and therefore didn't run.

---

## Run Metadata

Stored alongside each run:

```typescript
interface RunMeta {
  runId: string;
  tool: string;
  startedAt: string;      // ISO 8601
  completedAt: string;    // ISO 8601
  exitCode: number;
  cwd: string;
  command: string[];      // full command array
}
```

---

## Cross-References

- Storage format: see `02-storage.md`
- Plugin interface: see `03-plugin-architecture.md`
- Tool definitions: see `04-mcp-tools.md`
