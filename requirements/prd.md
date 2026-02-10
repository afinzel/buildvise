# MCP Build Tools Server – PRD

## Overview

**MCP Build Tools Server** is a user-installed, optional MCP server that provides structured access to build, test, lint, and package-management tooling.  
Its primary purpose is to reduce token usage and noise when LLM-based coding agents (e.g. Claude Code) interact with local development toolchains.

The MCP server exposes first-class, structured tools via the default MCP discovery mechanism.  
When present, agents prefer these tools; when absent, agents fall back to shell execution.

The MCP server is **not mandatory**, **not repo-owned**, and **not authoritative**.

---

## Problem Statement

Current LLM-driven development workflows are inefficient because agents:

- Execute builds/tests directly via shell
- Ingest large volumes of raw stdout/stderr
- Re-run commands unnecessarily
- Scrape logs heuristically
- Lack structured diagnostics

This results in:

- Excessive token consumption
- Slower feedback loops
- Poor signal-to-noise ratio
- Fragile reasoning

---

## Goals

- Provide structured build/test/lint/package results by default
- Minimise raw log ingestion
- Allow explicit, on-demand access to raw output
- Work across any repository
- Require installation once per user
- Integrate via standard MCP tool discovery
- Be extensible via a plugin architecture

---

## Non-Goals (v1)

- Symbol search / LSP integration
- AST analysis
- Code fixing or autofix
- Repo-owned configuration
- CI replacement
- Telemetry or analytics
- Toolchain auto-detection

---

## Target Users

- Individual developers using Claude Code
- Teams recommending optional tooling via `claude.md` / `agents.md`
- Power users optimising token usage and latency

---

## Key Principles

1. Optional, not mandatory
2. User-installed, not repo-installed
3. Wrapper, not policy engine
4. Structured by default, raw on demand
5. Explicit over clever
6. One build tool = one plugin
7. Graceful degradation if absent

---

## High-Level Architecture

Claude  
→ MCP (default discovery)  
→ MCP Build Tools Server  
→ Plugins (dotnet, npm, pnpm, bun, eslint, etc.)

---

## MCP Tools (Claude-facing)

### First-Class Tasks

- `build.run`
- `test.run`
- `lint.run`
- `package.install`
- `package.restore`

### Default Response Shape

```json
{
  "success": true,
  "errors": [],
  "warnings": [],
  "summary": {
    "errorCount": 0,
    "warningCount": 0
  }
}
```

### Diagnostics Schema

Each diagnostic includes:

- tool
- severity (`error` | `warning` | `info`)
- message
- code (if available)
- file / line / column (if available)
- log line range
- byte offsets

Line ranges and offsets are present for all diagnostics and set to `0` if unsupported.

---

## Raw Output Access (Opt-in)

Raw output is **always captured**, but **never returned by default**.

Available APIs:

- `run.raw` – byte-offset paged access to raw output
- `run.logRange` – line-based access using indexed ranges

Agents should prefer structured diagnostics and only request raw logs when required.

---

## Permissions & Safety

Plugins that mutate the workspace (e.g. package installs) must declare:

```ts
mutatesWorkspace = true
```

The MCP server enforces per-run confirmation before execution.  
Agents must explicitly confirm mutating operations.

---

## Plugin Model

### Plugin Responsibilities

Each plugin:

- Defines how commands are executed
- Owns flags and arguments
- Parses logs and/or artifacts
- Determines success semantics
- Emits normalised diagnostics

### Plugin Naming

Plugins are named by **tool**, not language:

- `dotnet.build`
- `dotnet.test`
- `npm.install`
- `pnpm.install`
- `bun.install`
- `eslint.lint`

---

## Storage Model

Per run:

- `raw.log`
- `raw.index.json` (line ↔ byte offsets)
- `diagnostics.json`
- `meta.json`

Retention policy:

- 14 days
- Cleanup on startup or scheduled sweep
- No compression (v1)

---

## Installation & Adoption

- One-line user installation
- MCP tools discovered via default MCP mechanism
- Repositories may recommend usage in `claude.md`
- MCP absence never blocks agent execution

---

## Success Criteria

- Agents prefer MCP tools when present
- Token usage during build/test workflows is significantly reduced
- Raw logs are rarely requested
- New toolchains can be added via plugins without core changes

---

## Deferred / Future Work

- Composite pipelines (build → test → lint)
- Tool auto-detection
- TRX / coverage parsing
- Lockfile diff reporting
- LSP / symbol integration
- Telemetry and feedback

---

## Status

Design locked.  
Ready for implementation.
