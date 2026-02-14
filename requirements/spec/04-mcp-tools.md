# MCP Tools

Buildvise exposes a **single MCP tool** (`build`) that dispatches by `action` parameter.

---

## Why Single Tool

| Approach | Token Cost per Invocation | Notes |
|----------|--------------------------|-------|
| Subagent | ~20,000-30,000 | Full system prompt duplicated |
| Many MCP tools | ~2,000-5,000 | Schemas loaded every turn |
| **Single MCP tool** | **~200** | One schema, self-describing responses |

---

## Tool: `build`

### Input Schema

```typescript
{
  action: 'exec' | 'log' | 'list';
  tool?: string;       // required for exec (e.g. "npm.build")
  cwd?: string;        // for exec, defaults to server cwd
  args?: string[];     // for exec, extra arguments
  runId?: string;      // required for log
  startLine?: number;  // for log, defaults to 1
  lineCount?: number;  // for log
}
```

### Actions

| Action | Description | Required Params |
|--------|-------------|-----------------|
| `exec` | Run a build/test/lint tool | `tool` |
| `log` | View log lines from a previous run | `runId` |
| `list` | Show available tools | (none) |

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

### exec action

```typescript
interface ToolResponse {
  success: boolean;
  errors?: SimpleDiagnostic[];
  warnings?: SimpleDiagnostic[];
  runId: string;
  summary?: TestSummary;
  hint?: string;  // self-describing follow-up instructions
}
```

The `hint` field tells the caller what to do next:
- On failure: how to fetch logs using the `log` action
- Always: where to report issues

### log action

```typescript
{
  lines: string[];
  startLine: number;
  endLine: number;
  totalLines: number;
  hasMore: boolean;
}
```

### list action

```typescript
{
  tools: Array<{ name: string; description: string }>;
}
```

---

## Self-Describing Responses

After `exec`, the response includes a `hint` field that guides follow-up actions without requiring the caller to remember API patterns:

**On failure:**
```json
{
  "success": false,
  "runId": "abc-123",
  "errors": [{ "file": "Foo.cs", "line": 42, "message": "CS1002: ; expected" }],
  "hint": "To view full logs: { action: 'log', runId: 'abc-123' }. Report issues: https://github.com/afinzel/buildvise/issues"
}
```

**On success:**
```json
{
  "success": true,
  "runId": "abc-123",
  "hint": "Report issues: https://github.com/afinzel/buildvise/issues"
}
```

---

## Typical Workflow

**1. Run a tool:**
```json
{ "action": "exec", "tool": "npm.build", "cwd": "/app" }
```

**2. Get structured response with hint:**
```json
{
  "success": false,
  "errors": [{ "file": "src/app.ts", "line": 42, "message": "TS2345: ..." }],
  "runId": "a1b2c3d4",
  "hint": "To view full logs: { action: 'log', runId: 'a1b2c3d4' }. ..."
}
```

**3. If more context needed, follow the hint:**
```json
{ "action": "log", "runId": "a1b2c3d4", "startLine": 1, "lineCount": 50 }
```

---

## When to Fetch Logs

Use the `log` action only when:
- The structured diagnostic is unclear or incomplete
- Multiple related errors need surrounding context
- The error message references output not captured in diagnostics
- Debugging why a command failed unexpectedly
- Test failures need full stack traces
- Empty errors array with `success: false`

**Default behavior:** Structured diagnostics are sufficient 90%+ of the time.

---

## Error Categories

| Situation | Response |
|-----------|----------|
| Build/test failure | `success: false`, errors with source locations |
| Warnings only | `success: true`, warnings populated |
| Unknown tool | `success: false`, single error with `UNKNOWN_TOOL` code |
| Missing params | `{ error: "Missing required parameter..." }` |

---

## Cross-References

- Diagnostic schema details: see `01-core-types.md`
- Raw log access APIs: see `05-raw-output.md`
- Plugin interface: see `03-plugin-architecture.md`
- Permission checks: see `06-permissions.md`
