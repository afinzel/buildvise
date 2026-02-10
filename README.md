# Buildvise

Structured build, test, and lint diagnostics for AI coding agents. Returns parsed errors, warnings, and test results instead of raw console output — achieving 10-50x token reduction.

## Installation

### As a Claude Code Plugin (Recommended)

Install via the [vise-tools](https://github.com/afinzel/vise-tools) marketplace:

```bash
claude plugin marketplace add afinzel/vise-tools
claude plugin install buildvise@vise-tools
```

This gives you a **build subagent** that Claude spawns on demand — build tool schemas only load in the subagent's context, keeping your main conversation clean.

### As a Standalone MCP Server

```bash
claude mcp add buildvise -- npx -y buildvise
```

Or add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "buildvise": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "buildvise"]
    }
  }
}
```

## Available Tools

| Tool | Description | Mutates Workspace |
|------|-------------|-------------------|
| `dotnet_build` | Build .NET projects | No |
| `dotnet_test` | Run .NET tests | No |
| `npm_install` | Install npm packages | Yes |
| `npm_build` | Run npm build script | No |
| `npm_test` | Run npm test script | No |
| `npm_run` | Run npm scripts | Varies |
| `pnpm_install` | Install pnpm packages | Yes |
| `pnpm_build` | Run pnpm build script | No |
| `pnpm_test` | Run pnpm test script | No |
| `pnpm_run` | Run pnpm scripts | Varies |
| `eslint_lint` | Run ESLint on files | No |
| `run_raw` | Get raw log output by byte offset | No |
| `run_logRange` | Get log lines by line number | No |
| `report_issue` | File a GitHub issue for Buildvise | No |

## How It Works

Instead of returning raw build output (thousands of tokens), Buildvise parses the output and returns structured diagnostics:

```json
{
  "success": false,
  "runId": "abc123",
  "summary": { "errors": 2, "warnings": 1 },
  "errors": [
    {
      "file": "src/app.ts",
      "line": 42,
      "severity": "error",
      "code": "TS2345",
      "message": "Argument of type 'string' is not assignable to parameter of type 'number'."
    }
  ]
}
```

When the structured diagnostics aren't enough, use `run_raw` or `run_logRange` with the `runId` to access the full output.

## Development

```bash
npm install
npm run build      # Compile TypeScript
npm run typecheck  # Type check without emitting
npm run dev        # Watch mode
npm test           # Run tests
```

## License

MIT
