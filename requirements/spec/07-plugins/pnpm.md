# pnpm Plugin

Plugin for pnpm package management.

---

## pnpm.install

### Overview

| Property | Value |
|----------|-------|
| Name | `pnpm.install` |
| Mutates Workspace | `true` |

### Command

```bash
pnpm install [args...]
```

### Input Schema

```typescript
interface PnpmInstallInput {
  args?: string[];    // e.g. ["--save-dev", "typescript"]
  cwd?: string;
}
```

### Common Arguments

- `<package>[@version]` - specific package
- `--save-dev` / `-D` - dev dependency
- `--save-exact` / `-E` - exact version
- `--frozen-lockfile` - CI mode, fail if lockfile needs update
- `--shamefully-hoist` - flat node_modules
- (no args) - install from package.json

### Success Semantics

- Exit code 0 = success
- Exit code non-zero = failure
- Warnings may exist on success

### Log Parsing

pnpm output format:

```
 WARN  deprecated package@1.0.0: This package is deprecated
 ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies
```

**Patterns:**

Warnings:
```regex
^\s*WARN\s+(?<code>\w+)?\s*(?<message>.+)$
```

Errors:
```regex
^\s*ERR_PNPM_(?<code>\w+)\s+(?<message>.+)$
```

### Sample Diagnostics

```json
[
  {
    "tool": "pnpm.install",
    "severity": "warning",
    "message": "deprecated inflight@1.0.6: This module is not supported",
    "code": "deprecated",
    "logRange": { "startLine": 3, "endLine": 3 },
    "byteOffsets": { "start": 89, "end": 156 }
  },
  {
    "tool": "pnpm.install",
    "severity": "error",
    "message": "Unmet peer dependencies",
    "code": "PEER_DEP_ISSUES",
    "logRange": { "startLine": 8, "endLine": 15 },
    "byteOffsets": { "start": 312, "end": 678 }
  }
]
```

---

## pnpm.build

### Overview

| Property | Value |
|----------|-------|
| Name | `pnpm.build` |
| Mutates Workspace | `false` |

### Command

```bash
pnpm run build [-- args...]
```

Runs the `build` script defined in package.json.

---

## pnpm.test

### Overview

| Property | Value |
|----------|-------|
| Name | `pnpm.test` |
| Mutates Workspace | `false` |

### Command

```bash
pnpm run test [-- args...]
```

Runs the `test` script defined in package.json. Parses Jest output for diagnostics.

### Test Summary

Responses include aggregated pass/fail counts:

```json
{
  "summary": {
    "passed": 45,
    "failed": 3,
    "skipped": 2,
    "total": 50
  }
}
```

---

## pnpm.run

### Overview

| Property | Value |
|----------|-------|
| Name | `pnpm.run` |
| Mutates Workspace | `false` |

### Command

```bash
pnpm run <script> [-- args...]
```

Runs any script defined in package.json. First argument is the script name.

---

## Cross-References

- Plugin interface: see `03-plugin-architecture.md`
- Diagnostic schema: see `01-core-types.md`
- Permission handling: see `06-permissions.md`
