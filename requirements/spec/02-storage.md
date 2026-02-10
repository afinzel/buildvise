# Storage

How run data is persisted and accessed.

---

## Storage Location

```
~/.local/share/mcp-build/runs/<run-id>/
```

Follows XDG Base Directory specification. The `run-id` is a UUID generated at run start.

---

## Per-Run Files

Each run creates a directory containing:

| File | Purpose |
|------|---------|
| `raw.log` | Complete stdout + stderr, interleaved |
| `raw.index.json` | Line number to byte offset mapping |
| `diagnostics.json` | Parsed `Diagnostic[]` array |
| `meta.json` | Run metadata (see `01-core-types.md`) |

---

## Index Format

`raw.index.json` enables efficient line-based access:

```typescript
interface LogIndex {
  lines: Array<{
    line: number;        // 1-indexed line number
    byteOffset: number;  // byte position in raw.log
    byteLength: number;  // length of this line in bytes
  }>;
  totalLines: number;
  totalBytes: number;
}
```

The index is built incrementally during log capture.

---

## Retention Policy

- **Duration:** 14 days from run completion
- **Cleanup trigger:** On server startup
- **Cleanup behavior:** Delete entire run directory if `completedAt` > 14 days ago

---

## Storage API

The storage module exposes:

```typescript
interface StorageAPI {
  createRun(tool: string, cwd: string): RunWriter;
  getRun(runId: string): RunReader | null;
  listRuns(): RunMeta[];
  cleanup(): void;
}

interface RunWriter {
  runId: string;
  appendLog(chunk: Buffer): void;
  writeDiagnostics(diagnostics: Diagnostic[]): void;
  complete(exitCode: number): void;
}

interface RunReader {
  meta: RunMeta;
  getDiagnostics(): Diagnostic[];
  getLogBytes(start: number, length: number): Buffer;
  getLogLines(startLine: number, count: number): string[];
}
```

---

## Cross-References

- Types used: see `01-core-types.md`
- Raw output tools: see `05-raw-output.md`
