# eslint Plugin

Plugin for ESLint JavaScript/TypeScript linting.

---

## eslint.lint

| Property | Value |
|----------|-------|
| Name | `eslint.lint` |
| Mutates Workspace | `false` |
| Command | `eslint [args...] --format json` |

**Note:** Plugin forces `--format json` for structured output.

**Input:** `{ args?: string[], cwd?: string }`

**Common args:** `<path>`, `--ext <extensions>`, `--max-warnings <n>`, `--config <path>`

**Success:** Exit 0 = no errors. Exit 1 = linting errors. Exit 2 = config/fatal error.

---

## Log Parsing

With `--format json`, ESLint outputs:

```json
[{ "filePath": "/path/file.ts", "messages": [
  { "ruleId": "no-unused-vars", "severity": 2,
    "message": "'foo' is defined but never used.",
    "line": 10, "column": 7 }
], "errorCount": 1, "warningCount": 0 }]
```

**Parsing:** Direct JSON parse. Severity: ESLint `1` = warning, `2` = error.

---

## Sample Diagnostics

```json
[
  { "tool": "eslint.lint", "severity": "error",
    "message": "'foo' is defined but never used.", "code": "no-unused-vars",
    "file": "src/utils.ts", "line": 10, "column": 7,
    "logRange": { "startLine": 0, "endLine": 0 },
    "byteOffsets": { "start": 0, "end": 0 } },
  { "tool": "eslint.lint", "severity": "warning",
    "message": "Unexpected console statement.", "code": "no-console",
    "file": "src/index.ts", "line": 25, "column": 1,
    "logRange": { "startLine": 0, "endLine": 0 },
    "byteOffsets": { "start": 0, "end": 0 } }
]
```

**Note:** `logRange`/`byteOffsets` are `0` because diagnostics come from JSON, not log lines.

---

## Cross-References

- Plugin interface: see `03-plugin-architecture.md`
- Diagnostic schema: see `01-core-types.md`
