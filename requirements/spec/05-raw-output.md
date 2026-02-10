# Raw Output Access

Opt-in APIs for accessing raw build/test logs.

---

## Design Principle

Raw output is **always captured** but **never returned by default**.

Use raw logs for: debugging parser failures, investigating unexpected errors, accessing output not in diagnostics.

**Token efficiency:** Raw logs can be 10-100x larger than structured diagnostics. A build with errors might have 5,000+ tokens of raw output but only 100 tokens of structured diagnostics. Always start with structured responses and only fetch raw logs when needed.

---

## run.raw

Byte-offset paged access to raw output.

**When to use:**
- Get full stack traces from failed tests
- When the structured errors array is empty but `success=false`
- Initial debugging to understand what happened
- Prefer this over `run.logRange` for first-pass investigation

**Input:**
```typescript
{ runId: string, offset?: number, length?: number }  // defaults: 0, 4096
```

**Output:**
```typescript
{
  data: string,        // UTF-8 decoded
  offset: number,
  length: number,
  totalBytes: number,
  hasMore: boolean
}
```

**Example workflow:**
```typescript
// After dotnet_test returns a failure, get complete output:
const result = dotnet_test({ cwd: "/app" });  // success: false
const raw = run_raw({ runId: result.runId }); // see full output including stack traces
```

---

## run.logRange

Line-based access using indexed ranges.

**When to use:**
- Fetch context around a specific line number from a diagnostic
- Zoom into a specific section after identifying the area of interest with `run.raw`
- Each diagnostic includes `logRange.startLine` - use this to get surrounding context

**Prefer `run.raw` for initial debugging; use `run.logRange` to zoom into specific sections.**

**Input:**
```typescript
{ runId: string, startLine: number, lineCount?: number }  // 1-indexed, default 50
```

**Output:**
```typescript
{
  lines: string[],
  startLine: number,
  endLine: number,
  totalLines: number,
  hasMore: boolean
}
```

**Example:**
```typescript
// Get context around a diagnostic
const diagnostic = result.errors[0];
const context = run_logRange({
  runId: result.runId,
  startLine: diagnostic.logRange.startLine - 5,
  lineCount: 15
});
```

---

## Diagnostic Log References

Each diagnostic includes log location hints:

```typescript
{ logRange: { startLine: 42, endLine: 44 }, byteOffsets: { start: 1024, end: 1156 } }
```

Fetch context around an error:
```typescript
run.logRange({ runId, startLine: diagnostic.logRange.startLine - 5, lineCount: 10 })
```

---

## Paging

For large logs, use `hasMore` and increment `offset` or `startLine` accordingly.

---

## Cross-References

- Run storage format: see `02-storage.md`
- Diagnostic schema: see `01-core-types.md`
