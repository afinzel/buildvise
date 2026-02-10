# Buildvise

An MCP server providing structured build, test, lint, and package-management diagnostics with 10-50x token reduction.

## Specifications

Implementation specs are in `requirements/spec/`. Load the relevant spec for the current task:

- `01-core-types.md` - Shared types and interfaces
- `02-storage.md` - Run data persistence
- `03-plugin-architecture.md` - Plugin contract and lifecycle
- `04-mcp-tools.md` - MCP tool surface (key doc for error handling workflow)
- `05-raw-output.md` - Raw log access APIs
- `06-permissions.md` - Confirmation flows for mutating operations
- `07-plugins/*.md` - Individual plugin implementations

## Code Standards

### Clean Code

- Single responsibility: one concept per file
- Clear naming: descriptive, no abbreviations
- Small functions: each does one thing
- No dead code or commented-out blocks
- Minimal comments: code should be self-documenting, comments explain "why" not "what"

### File Structure

- **One file per type/class/concept**
- Barrel exports via `index.ts` for each module
- Directory structure:
  ```
  src/
  ├── types/           # Core type definitions
  ├── storage/         # Run data persistence
  ├── plugins/         # Plugin implementations
  └── index.ts         # Server entry point
  tests/               # Tests mirror src/ structure
  ```

### TypeScript

- Strict mode enabled
- Explicit return types on exported functions
- Use `type` imports where possible
- Prefer `interface` for object shapes, `type` for unions/aliases

### Testing

- **Everything must be unit tested**
- Tests live in `tests/` mirroring `src/` structure: `src/plugins/foo.ts` -> `tests/plugins/foo.test.ts`
- Use descriptive test names: `it('returns empty array when no diagnostics found')`
- Test edge cases and error conditions
- Run tests before committing

## Development

```bash
npm run build      # Compile TypeScript
npm run typecheck  # Type check without emitting
npm run dev        # Watch mode
npm test           # Run tests
```
