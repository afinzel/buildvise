# dotnet Plugins

Plugins for .NET CLI tooling.

---

## dotnet.build

| Property | Value |
|----------|-------|
| Name | `dotnet.build` |
| Mutates Workspace | `false` |
| Command | `dotnet build [args...]` |

**Input:** `{ args?: string[], cwd?: string }`

**Common args:** `--configuration`, `--no-restore`, `--verbosity`, project/solution path

**Success:** Exit 0 = success. Warnings may exist on success.

**Log format (MSBuild):**

Source-level diagnostics (with line/column):
```
path/File.cs(line,col): error CS1234: Error message
```

Project-level diagnostics (no line/column, e.g., file locks):
```
path/Project.csproj : error MSB3021: Unable to copy file...
MSBUILD : error MSB1009: Project file does not exist.
```

**Regex (source-level):**
```regex
^(?<file>[^(]+)\((?<line>\d+),(?<col>\d+)\):\s*(?<severity>error|warning)\s+(?<code>\w+):\s*(?<message>.+)$
```

**Regex (project-level):**
```regex
^(?<file>.+?)\s*:\s*(?<severity>error|warning)\s+(?<code>\w+):\s*(?<message>.+)$
```

**Sample diagnostic (source-level):**
```json
{
  "tool": "dotnet.build", "severity": "error",
  "message": "The name 'foo' does not exist in the current context",
  "code": "CS0103", "file": "src/Program.cs", "line": 42, "column": 13,
  "logRange": { "startLine": 15, "endLine": 15 },
  "byteOffsets": { "start": 892, "end": 987 }
}
```

**Sample diagnostic (project-level, e.g., file lock):**
```json
{
  "tool": "dotnet.build", "severity": "error",
  "message": "Unable to copy file \"obj\\Debug\\net8.0\\Project.dll\" to \"bin\\Debug\\net8.0\\Project.dll\". The process cannot access the file because it is being used by another process.",
  "code": "MSB3021", "file": "R:\\path\\Project.csproj",
  "logRange": { "startLine": 8, "endLine": 8 }
}
```

---

## dotnet.test

| Property | Value |
|----------|-------|
| Name | `dotnet.test` |
| Mutates Workspace | `false` |
| Command | `dotnet test [args...]` |

**Input:** `{ args?: string[], cwd?: string }`

**Common args:** `--filter`, `--no-build`, `--configuration`, `--logger`, `--verbosity`

**Success:** Exit 0 = all tests passed.

**Log format:**
```
Failed TestClass.TestMethod [42 ms]
  Error Message:
   Assert.Equal() Failure
  Stack Trace:
   at TestClass.TestMethod() in /path/File.cs:line 25
```

**Strategy:** Parse "Failed" lines, extract test name and stack trace location.

**Sample diagnostic:**
```json
{
  "tool": "dotnet.test", "severity": "error",
  "message": "Assert.Equal() Failure: Expected 5, Actual 3",
  "code": "TestFailure", "file": "tests/CalculatorTests.cs", "line": 25,
  "logRange": { "startLine": 8, "endLine": 12 },
  "byteOffsets": { "start": 445, "end": 623 }
}
```

**Test summary:** Responses include aggregated pass/fail counts across all test projects:
```json
{
  "summary": {
    "passed": 18,
    "failed": 0,
    "skipped": 0,
    "total": 18,
    "projectsBuildFailed": 0
  }
}
```

The `projectsBuildFailed` field counts test projects that failed to compile and therefore didn't run.

---

## Cross-References

- Plugin interface: see `03-plugin-architecture.md`
- Diagnostic schema: see `01-core-types.md`
