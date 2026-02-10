# npm Plugin

Plugin for npm package management.

---

## npm.install

### Overview

| Property | Value |
|----------|-------|
| Name | `npm.install` |
| Mutates Workspace | `true` |

### Command

```bash
npm install [args...]
```

### Input Schema

```typescript
interface NpmInstallInput {
  args?: string[];    // e.g. ["--save-dev", "typescript"]
  cwd?: string;
}
```

### Common Arguments

- `<package>[@version]` - specific package
- `--save-dev` / `-D` - dev dependency
- `--save-exact` / `-E` - exact version
- `--legacy-peer-deps` - ignore peer dep conflicts
- (no args) - install from package.json

### Success Semantics

- Exit code 0 = success
- Exit code non-zero = failure
- Warnings (deprecation, peer deps) may exist on success

### Log Parsing

npm output includes structured warnings:

```
npm warn deprecated package@1.0.0: This package is deprecated
npm warn ERESOLVE overriding peer dependency
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
```

**Patterns:**

Warnings:
```regex
^npm warn\s+(?<code>\w+)?\s*(?<message>.+)$
```

Errors:
```regex
^npm error\s+(?:code\s+)?(?<code>\w+)?\s*(?<message>.+)$
```

### Sample Diagnostics

```json
[
  {
    "tool": "npm.install",
    "severity": "warning",
    "message": "deprecated inflight@1.0.6: This module is not supported",
    "code": "deprecated",
    "logRange": { "startLine": 5, "endLine": 5 },
    "byteOffsets": { "start": 234, "end": 312 }
  },
  {
    "tool": "npm.install",
    "severity": "error",
    "message": "ERESOLVE unable to resolve dependency tree",
    "code": "ERESOLVE",
    "logRange": { "startLine": 12, "endLine": 25 },
    "byteOffsets": { "start": 567, "end": 1234 }
  }
]
```

---

## npm.build

### Overview

| Property | Value |
|----------|-------|
| Name | `npm.build` |
| Mutates Workspace | `false` |

### Command

```bash
npm run build [-- args...]
```

Runs the `build` script defined in package.json.

---

## npm.test

### Overview

| Property | Value |
|----------|-------|
| Name | `npm.test` |
| Mutates Workspace | `false` |

### Command

```bash
npm run test [-- args...]
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

## npm.run

### Overview

| Property | Value |
|----------|-------|
| Name | `npm.run` |
| Mutates Workspace | `false` |

### Command

```bash
npm run <script> [-- args...]
```

Runs any script defined in package.json. First argument is the script name.

---

## Cross-References

- Plugin interface: see `03-plugin-architecture.md`
- Diagnostic schema: see `01-core-types.md`
- Permission handling: see `06-permissions.md`
