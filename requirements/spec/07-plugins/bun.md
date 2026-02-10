# bun Plugin

Plugin for bun package management.

---

## bun.install

### Overview

| Property | Value |
|----------|-------|
| Name | `bun.install` |
| Mutates Workspace | `true` |

### Command

```bash
bun install [args...]
```

### Input Schema

```typescript
interface BunInstallInput {
  args?: string[];    // e.g. ["--dev", "typescript"]
  cwd?: string;
}
```

### Common Arguments

- `<package>[@version]` - specific package
- `--dev` / `-d` - dev dependency
- `--exact` - exact version
- `--frozen-lockfile` - fail if lockfile needs update
- `--production` - skip devDependencies
- (no args) - install from package.json

### Success Semantics

- Exit code 0 = success
- Exit code non-zero = failure
- bun typically produces minimal output on success

### Log Parsing

bun output is minimal but includes:

```
bun install v1.0.0
error: could not resolve "nonexistent-package"
warn: deprecated package@1.0.0
```

**Patterns:**

Errors:
```regex
^error:\s*(?<message>.+)$
```

Warnings:
```regex
^warn:\s*(?<message>.+)$
```

### Sample Diagnostics

```json
[
  {
    "tool": "bun.install",
    "severity": "error",
    "message": "could not resolve \"nonexistent-package\"",
    "logRange": { "startLine": 2, "endLine": 2 },
    "byteOffsets": { "start": 45, "end": 98 }
  }
]
```

### Notes

- bun is significantly faster than npm/pnpm
- Output format may vary between versions
- Consider using `--verbose` flag for more detailed parsing

---

## Cross-References

- Plugin interface: see `03-plugin-architecture.md`
- Diagnostic schema: see `01-core-types.md`
- Permission handling: see `06-permissions.md`
