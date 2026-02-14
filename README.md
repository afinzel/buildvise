# Buildvise

**Goal: Minimize the token cost of build, test, and lint operations in AI coding agents.**

Every time an AI agent runs `npm test` or `dotnet build` via a shell command, thousands of tokens of raw console output flow into the context window. Most of that output is noise — ANSI codes, progress bars, repeated headers. The actual signal is a handful of errors with file locations. Buildvise parses that output into structured diagnostics, achieving 10-50x token reduction.

But structured output is only half the problem. How you *deliver* that output to the agent matters just as much.

## Why MCP Over Subagents

We started with a subagent approach — Claude spawns a "build specialist" agent that has the buildvise tools. This works, but every subagent invocation duplicates the entire Claude system prompt, all MCP server instructions, and CLAUDE.md into a brand-new conversation. That's ~20-30K tokens of overhead *before any build even runs*.

We considered exposing many individual MCP tools (one per build tool), but each tool schema gets loaded into every turn of the main conversation. With 11+ tools, that's 2-5K tokens of schema bloat on every message.

The sweet spot is a **single MCP tool** with an `action` parameter. One schema (~200 tokens), and the response itself tells the agent what to do next via a `hint` field — no need to preload follow-up tool schemas.

| Approach | Overhead per Invocation | Where the Cost Lives |
|----------|------------------------|---------------------|
| Subagent | ~20,000-30,000 tokens | Full system prompt duplicated into new conversation |
| Many MCP tools | ~2,000-5,000 tokens | Tool schemas loaded into every turn of main conversation |
| **Single MCP tool** | **~200 tokens** | One schema in main conversation, self-describing responses |

Buildvise also works as a plain CLI, so you can reference it from CLAUDE.md bash instructions without any MCP setup at all.

## Installation

### As a Claude Code Plugin (Recommended)

Install via the [vise-tools](https://github.com/afinzel/vise-tools) marketplace:

```bash
claude plugin marketplace add afinzel/vise-tools
claude plugin install buildvise@vise-tools
```

This registers a single `build` MCP tool that handles all operations through one endpoint.

### Manual MCP Configuration

Add to your `.mcp.json`:

```json
{
  "buildvise": {
    "command": "npx",
    "args": ["-y", "buildvise", "mcp"]
  }
}
```

### CLI Usage

Buildvise also works as a standalone CLI for use in scripts or CLAUDE.md instructions:

```bash
npx -y buildvise exec npm.build --cwd /path/to/project
npx -y buildvise exec npm.test --cwd /path/to/project -- --coverage
npx -y buildvise list
npx -y buildvise log-range <runId> --start 1 --count 20
```

## The `build` Tool

One tool, three actions:

| Action | Description | Required Params |
|--------|-------------|-----------------|
| `exec` | Run a build/test/lint tool | `tool` |
| `log` | View log lines from a previous run | `runId` |
| `list` | Show available tools | (none) |

### Available Tools (for `exec`)

| Tool | Description |
|------|-------------|
| `dotnet.build` | Build .NET projects |
| `dotnet.test` | Run .NET tests |
| `npm.install` | Install npm packages |
| `npm.build` | Run npm build script |
| `npm.test` | Run npm test script |
| `npm.run` | Run npm scripts |
| `pnpm.install` | Install pnpm packages |
| `pnpm.build` | Run pnpm build script |
| `pnpm.test` | Run pnpm test script |
| `pnpm.run` | Run pnpm scripts |
| `eslint.lint` | Run ESLint on files |

## How It Works

Instead of returning raw build output (thousands of tokens), Buildvise parses the output and returns structured diagnostics:

```json
{
  "success": false,
  "runId": "abc123",
  "errors": [
    {
      "file": "src/app.ts",
      "line": 42,
      "code": "TS2345",
      "message": "Argument of type 'string' is not assignable to parameter of type 'number'."
    }
  ],
  "hint": "To view full logs: { action: 'log', runId: 'abc123' }. Report issues: https://github.com/afinzel/buildvise/issues"
}
```

The `hint` field tells the agent exactly what to do next — no need to remember separate tool names or API patterns. On success, the hint includes just the issue reporting URL.

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
