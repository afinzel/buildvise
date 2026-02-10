/**
 * Tests for Next.js output parser
 */

import { describe, it, expect } from 'vitest';
import { parseNextjsOutput } from '../../../src/plugins/nextjs/parse-nextjs.js';

describe('parseNextjsOutput', () => {
  it('returns empty array for clean output', () => {
    const output = `
▲ Next.js 16.1.1 (Turbopack)
✓ Compiled successfully in 9.4s
`;
    const diagnostics = parseNextjsOutput({ tool: 'pnpm.build', output });
    expect(diagnostics).toEqual([]);
  });

  it('parses Next.js TypeScript error with relative path', () => {
    const output = `./app/page.tsx:10:5
Type error: Argument of type 'string' is not assignable to parameter of type 'number'.`;
    const diagnostics = parseNextjsOutput({ tool: 'pnpm.build', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].file).toBe('./app/page.tsx');
    expect(diagnostics[0].line).toBe(10);
    expect(diagnostics[0].column).toBe(5);
    expect(diagnostics[0].message).toBe(
      "Argument of type 'string' is not assignable to parameter of type 'number'."
    );
  });

  it('parses Next.js TypeScript error from real output', () => {
    const output = `▲ Next.js 16.1.1 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
✓ Compiled successfully in 9.4s
   Running TypeScript ...
Failed to compile.

./app/(site)/_components/LoadMore.tsx:69:16
Type error: Argument of type 'unknown[]' is not assignable to parameter of type 'SetStateAction<VideoItem[]>'.

 67 |           new Map(data.map((v: VideoItem) => [v.id, v])).values()
 68 |       );
 69 |       setItems(uniqueData);
    |                ^`;
    const diagnostics = parseNextjsOutput({ tool: 'pnpm.build', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].file).toBe('./app/(site)/_components/LoadMore.tsx');
    expect(diagnostics[0].line).toBe(69);
    expect(diagnostics[0].column).toBe(16);
    expect(diagnostics[0].message).toBe(
      "Argument of type 'unknown[]' is not assignable to parameter of type 'SetStateAction<VideoItem[]>'."
    );
  });

  it('parses multiple Next.js TypeScript errors', () => {
    const output = `./app/page.tsx:10:5
Type error: First error message

./app/other.tsx:20:10
Type error: Second error message`;
    const diagnostics = parseNextjsOutput({ tool: 'pnpm.build', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].file).toBe('./app/page.tsx');
    expect(diagnostics[0].line).toBe(10);
    expect(diagnostics[1].file).toBe('./app/other.tsx');
    expect(diagnostics[1].line).toBe(20);
  });

  it('assigns correct log line numbers', () => {
    const output = `Line 1
Line 2
./app/page.tsx:10:5
Type error: Error on lines 3-4
Line 5`;
    const diagnostics = parseNextjsOutput({ tool: 'pnpm.build', output });

    expect(diagnostics[0].logRange.startLine).toBe(3);
    expect(diagnostics[0].logRange.endLine).toBe(4);
  });

  it('sets tool name correctly', () => {
    const output = `./app/page.tsx:10:5
Type error: Some error`;
    const diagnostics = parseNextjsOutput({ tool: 'npm.build', output });

    expect(diagnostics[0].tool).toBe('npm.build');
  });

  it('handles paths without leading dot', () => {
    const output = `app/page.tsx:10:5
Type error: Some error`;
    const diagnostics = parseNextjsOutput({ tool: 'pnpm.build', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].file).toBe('app/page.tsx');
  });

  it('handles tsx, ts, jsx, js files', () => {
    const output = `./app/page.tsx:1:1
Type error: tsx error
./lib/utils.ts:2:2
Type error: ts error
./components/Button.jsx:3:3
Type error: jsx error
./lib/config.js:4:4
Type error: js error`;
    const diagnostics = parseNextjsOutput({ tool: 'pnpm.build', output });

    expect(diagnostics).toHaveLength(4);
    expect(diagnostics[0].file).toBe('./app/page.tsx');
    expect(diagnostics[1].file).toBe('./lib/utils.ts');
    expect(diagnostics[2].file).toBe('./components/Button.jsx');
    expect(diagnostics[3].file).toBe('./lib/config.js');
  });

  it('ignores non-matching patterns', () => {
    const output = `./app/page.tsx:10:5
Not a Type error line`;
    const diagnostics = parseNextjsOutput({ tool: 'pnpm.build', output });

    expect(diagnostics).toEqual([]);
  });

  it('parses exact raw output from pnpm build with Next.js', () => {
    // This is the exact raw output captured from a real pnpm build failure
    const output =
      '\n> devvids@1.0.0 build /Users/afinzel/work/vidert\n> next build\n\n▲ Next.js 16.1.1 (Turbopack)\n- Environments: .env.local\n\n  Creating an optimized production build ...\n  Using external babel configuration from /Users/afinzel/work/vidert/babel.config.js\n⚠ It looks like there is a custom Babel configuration that can be removed.\n✓ Compiled successfully in 9.4s\n   Running TypeScript ...\nFailed to compile.\n\n./app/(site)/_components/LoadMore.tsx:69:16\nType error: Argument of type \'unknown[]\' is not assignable to parameter of type \'SetStateAction<VideoItem[]>\'.\n  Type \'unknown[]\' is not assignable to type \'VideoItem[]\'.\n    Type \'unknown\' is not assignable to type \'VideoItem\'.\n\n\u001b[0m \u001b[90m 67 |\u001b[39m           \u001b[36mnew\u001b[39m \u001b[33mMap\u001b[39m(data\u001b[33m.\u001b[39mmap((v\u001b[33m:\u001b[39m \u001b[33mVideoItem\u001b[39m) \u001b[33m=>\u001b[39m [v\u001b[33m.\u001b[39mid\u001b[33m,\u001b[39m v]))\u001b[33m.\u001b[39mvalues()\n \u001b[90m 68 |\u001b[39m       )\u001b[33m;\u001b[39m\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m 69 |\u001b[39m       setItems(uniqueData)\u001b[33m;\u001b[39m\n \u001b[90m    |\u001b[39m                \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n \u001b[90m 70 |\u001b[39m       setDone(data\u001b[33m.\u001b[39mlength \u001b[33m<\u001b[39m limit)\u001b[33m;\u001b[39m\n \u001b[90m 71 |\u001b[39m     } \u001b[36mfinally\u001b[39m {\n \u001b[90m 72 |\u001b[39m       setLoading(\u001b[36mfalse\u001b[39m)\u001b[33m;\u001b[39m\u001b[0m\nNext.js build worker exited with code: 1 and signal: null\n ELIFECYCLE  Command failed with exit code 1.\n';

    const diagnostics = parseNextjsOutput({ tool: 'pnpm.build', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].file).toBe('./app/(site)/_components/LoadMore.tsx');
    expect(diagnostics[0].line).toBe(69);
    expect(diagnostics[0].column).toBe(16);
    expect(diagnostics[0].message).toBe(
      "Argument of type 'unknown[]' is not assignable to parameter of type 'SetStateAction<VideoItem[]>'."
    );
  });
});
