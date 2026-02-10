# MCP Tools

The MCP tool surface exposed to Claude.

---

## Tool Naming

Tools match 1:1 with plugins:

`dotnet.build`, `dotnet.test`, `npm.install`, `pnpm.install`, `bun.install`, `eslint.lint`

No generic dispatchers. Each tool is first-class.

---

## Input Schema

```typescript
interface ToolInput {
  args?: string[];   // arguments passed to underlying command
  cwd?: string;      // working directory (defaults to server cwd)
}
```

---

## Token Efficiency

Structured diagnostics use significantly fewer tokens than raw build output. A typical build failure might produce 500+ lines of output, but the structured response extracts only the essential information:

| Approach | Typical Tokens |
|----------|----------------|
| Raw `dotnet build` output | 2,000 - 10,000+ |
| Structured diagnostic | 50 - 200 |

**Best practice:** Start with structured diagnostics. Only fetch raw logs when you need additional context (stack traces, surrounding output). This keeps conversations efficient and reduces costs.

---

## Output Schema

All tools return structured diagnostics:

```typescript
interface ToolResponse {
  success: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
  runId: string;
  summary?: TestSummary;  // present for test plugins only
}
```

Test plugins include a summary with pass/fail counts:

```typescript
interface TestSummary {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  projectsBuildFailed?: number;
}
```

---

## Understanding Diagnostics

Each diagnostic contains everything Claude needs to locate and understand an error:

```typescript
interface Diagnostic {
  tool: string;        // which tool produced this
  severity: 'error' | 'warning' | 'info';
  message: string;     // human-readable error description
  code?: string;       // error code (e.g. "CS0103", "ERESOLVE")

  // Source location (when available)
  file?: string;       // path to source file
  line?: number;       // 1-indexed line number
  column?: number;     // 1-indexed column number

  // Raw log references (for drilling deeper)
  logRange: { startLine: number; endLine: number };
  byteOffsets: { start: number; end: number };
}
```

**Key insight:** Most errors can be resolved using just `file`, `line`, `column`, and `message`. The `logRange` and `byteOffsets` are escape hatches for when Claude needs more context.

---

## Typical Workflow

**1. Run build tool, get structured response:**
```json
{
  "success": false,
  "errors": [{
    "tool": "dotnet.build",
    "severity": "error",
    "message": "The name 'userId' does not exist in the current context",
    "code": "CS0103",
    "file": "src/Services/UserService.cs",
    "line": 47,
    "column": 23,
    "logRange": { "startLine": 12, "endLine": 12 },
    "byteOffsets": { "start": 1847, "end": 1952 }
  }],
  "warnings": [],
  "runId": "a1b2c3d4-..."
}
```

**1b. Run test tool, get test summary:**
```json
{
  "success": true,
  "errors": [],
  "warnings": [],
  "runId": "e5f6g7h8-...",
  "summary": {
    "passed": 18,
    "failed": 0,
    "skipped": 0,
    "total": 18
  }
}
```

**2. Claude reads the source file** at line 47 to understand the error.

**3. If more context needed**, Claude can fetch surrounding log output:
```typescript
run.logRange({ runId: "a1b2c3d4-...", startLine: 10, lineCount: 10 })
```

---

## Debugging Workflow

When a build or test fails, follow this workflow:

1. **Run dotnet_test/dotnet_build** → get structured errors + runId
2. **If errors array is empty but success=false**, use `run.raw` to see what happened
3. **For test failures**, use `run.raw` to get full stack traces
4. **Use `run.logRange`** to fetch specific line ranges around an error (each diagnostic includes `logRange.startLine`)

**Example: Investigating a test failure**
```typescript
// 1. Run tests
const result = dotnet_test({ cwd: "/app" });
// result: { success: false, errors: [...], runId: "abc123", summary: { failed: 1 } }

// 2. Get full output with stack traces
const raw = run_raw({ runId: "abc123" });

// 3. Or zoom into a specific diagnostic
const context = run_logRange({
  runId: "abc123",
  startLine: result.errors[0].logRange.startLine - 5,
  lineCount: 20
});
```

---

## When to Fetch Raw Logs

Claude should request raw logs only when:
- The structured diagnostic is unclear or incomplete
- Multiple related errors need surrounding context
- The error message references output not captured in diagnostics
- Debugging why a command failed unexpectedly
- **Test failures** - to see full stack traces
- **Empty errors array** - when success=false but no diagnostics parsed

**Default behavior:** Structured diagnostics are sufficient 90%+ of the time. Raw logs consume many more tokens, so only fetch them when the structured response doesn't provide enough information.

---

## Error Categories

| Situation | Response |
|-----------|----------|
| Build/test failure | `success: false`, errors populated with source locations |
| Warnings only | `success: true`, warnings populated |
| Command not found | `success: false`, single error (no file/line) |
| Permission denied | `success: false`, error with `code: "PERMISSION_DENIED"` |

---

## Cross-References

- Diagnostic schema details: see `01-core-types.md`
- Raw log access APIs: see `05-raw-output.md`
- Plugin interface: see `03-plugin-architecture.md`
- Permission checks: see `06-permissions.md`
