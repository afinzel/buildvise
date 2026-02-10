import { describe, it, expect } from 'vitest';
import { parseBuildOutput, parseBuildLine } from '../../../src/plugins/dotnet/parse-build.js';

describe('parseBuildLine', () => {
  it('parses error diagnostic', () => {
    const line =
      'src/Program.cs(42,13): error CS0103: The name \'foo\' does not exist in the current context';
    const result = parseBuildLine(line, 15, 'dotnet.build');

    expect(result.diagnostic).not.toBeNull();
    expect(result.diagnostic!.severity).toBe('error');
    expect(result.diagnostic!.code).toBe('CS0103');
    expect(result.diagnostic!.file).toBe('src/Program.cs');
    expect(result.diagnostic!.line).toBe(42);
    expect(result.diagnostic!.column).toBe(13);
    expect(result.diagnostic!.message).toBe(
      "The name 'foo' does not exist in the current context"
    );
    expect(result.diagnostic!.logRange.startLine).toBe(15);
  });

  it('parses warning diagnostic', () => {
    const line =
      'src/Utils.cs(10,5): warning CS0168: The variable \'x\' is declared but never used';
    const result = parseBuildLine(line, 8, 'dotnet.build');

    expect(result.diagnostic).not.toBeNull();
    expect(result.diagnostic!.severity).toBe('warning');
    expect(result.diagnostic!.code).toBe('CS0168');
  });

  it('returns null for non-diagnostic line', () => {
    const line = 'Build succeeded.';
    const result = parseBuildLine(line, 1, 'dotnet.build');

    expect(result.diagnostic).toBeNull();
  });

  it('handles paths with spaces', () => {
    const line =
      'src/My Project/File.cs(1,1): error CS1234: Some error';
    const result = parseBuildLine(line, 1, 'dotnet.build');

    expect(result.diagnostic).not.toBeNull();
    expect(result.diagnostic!.file).toBe('src/My Project/File.cs');
  });

  it('parses project-level error without line/column', () => {
    const line =
      'R:\\path\\to\\Project.csproj : error MSB3021: Unable to copy file "obj\\Debug\\Project.dll" to "bin\\Debug\\Project.dll". The process cannot access the file because it is being used by another process.';
    const result = parseBuildLine(line, 5, 'dotnet.build');

    expect(result.diagnostic).not.toBeNull();
    expect(result.diagnostic!.severity).toBe('error');
    expect(result.diagnostic!.code).toBe('MSB3021');
    expect(result.diagnostic!.file).toBe('R:\\path\\to\\Project.csproj');
    expect(result.diagnostic!.line).toBeUndefined();
    expect(result.diagnostic!.column).toBeUndefined();
    expect(result.diagnostic!.message).toContain('Unable to copy file');
    expect(result.diagnostic!.logRange.startLine).toBe(5);
  });

  it('parses MSBUILD project-level error', () => {
    const line = 'MSBUILD : error MSB1009: Project file does not exist.';
    const result = parseBuildLine(line, 3, 'dotnet.build');

    expect(result.diagnostic).not.toBeNull();
    expect(result.diagnostic!.severity).toBe('error');
    expect(result.diagnostic!.code).toBe('MSB1009');
    expect(result.diagnostic!.file).toBe('MSBUILD');
  });

  it('parses project-level warning', () => {
    const line =
      'R:\\path\\Project.csproj : warning NU1903: Package has a known vulnerability';
    const result = parseBuildLine(line, 2, 'dotnet.build');

    expect(result.diagnostic).not.toBeNull();
    expect(result.diagnostic!.severity).toBe('warning');
    expect(result.diagnostic!.code).toBe('NU1903');
  });
});

describe('parseBuildOutput', () => {
  it('returns empty array for clean build', () => {
    const output = `
Microsoft (R) Build Engine version 17.0.0
Build succeeded.
    0 Warning(s)
    0 Error(s)
`;
    const diagnostics = parseBuildOutput({ tool: 'dotnet.build', output });

    expect(diagnostics).toEqual([]);
  });

  it('parses multiple diagnostics', () => {
    const output = `
src/A.cs(10,5): error CS0103: Error one
src/B.cs(20,10): warning CS0168: Warning one
src/C.cs(30,15): error CS0246: Error two
`;
    const diagnostics = parseBuildOutput({ tool: 'dotnet.build', output });

    expect(diagnostics).toHaveLength(3);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[1].severity).toBe('warning');
    expect(diagnostics[2].severity).toBe('error');
  });

  it('assigns correct line numbers', () => {
    const output = `Line 1
src/A.cs(1,1): error CS0001: First error
Line 3
src/B.cs(2,2): error CS0002: Second error`;
    const diagnostics = parseBuildOutput({ tool: 'dotnet.build', output });

    expect(diagnostics[0].logRange.startLine).toBe(2);
    expect(diagnostics[1].logRange.startLine).toBe(4);
  });

  it('parses file lock errors from build output', () => {
    const output = `Microsoft (R) Build Engine version 17.0.0
  Determining projects to restore...
  All projects are up-to-date for restore.
  MyProject -> R:\\path\\bin\\Debug\\net8.0\\MyProject.dll
R:\\path\\MyProject.csproj : error MSB3021: Unable to copy file "obj\\Debug\\net8.0\\MyProject.dll" to "bin\\Debug\\net8.0\\MyProject.dll". The process cannot access the file because it is being used by another process.

Build FAILED.
`;
    const diagnostics = parseBuildOutput({ tool: 'dotnet.build', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].code).toBe('MSB3021');
    expect(diagnostics[0].message).toContain('Unable to copy file');
    expect(diagnostics[0].message).toContain('being used by another process');
  });

  it('parses mixed source and project errors', () => {
    const output = `src/Program.cs(10,5): error CS0103: Name does not exist
R:\\path\\Project.csproj : error MSB3021: File lock error
src/Utils.cs(20,10): warning CS0168: Unused variable`;
    const diagnostics = parseBuildOutput({ tool: 'dotnet.build', output });

    expect(diagnostics).toHaveLength(3);
    expect(diagnostics[0].code).toBe('CS0103');
    expect(diagnostics[0].line).toBe(10);
    expect(diagnostics[1].code).toBe('MSB3021');
    expect(diagnostics[1].line).toBeUndefined();
    expect(diagnostics[2].code).toBe('CS0168');
  });

  it('handles Windows line endings (CRLF)', () => {
    const output =
      'src/A.cs(10,5): error CS0103: Error one\r\n' +
      'src/B.cs(20,10): warning CS0168: Warning one\r\n' +
      'C:\\Program Files\\dotnet\\sdk\\Microsoft.Common.targets(5080,5): error MSB3027: Could not copy file\r\n';
    const diagnostics = parseBuildOutput({ tool: 'dotnet.build', output });

    expect(diagnostics).toHaveLength(3);
    expect(diagnostics[0].code).toBe('CS0103');
    expect(diagnostics[1].code).toBe('CS0168');
    expect(diagnostics[2].code).toBe('MSB3027');
    expect(diagnostics[2].file).toBe(
      'C:\\Program Files\\dotnet\\sdk\\Microsoft.Common.targets'
    );
  });

  it('deduplicates MSB3026 retry warnings', () => {
    const output = `C:\\sdk\\targets(100,5): warning MSB3026: Could not copy "A.dll". Beginning retry 1 in 1000ms. File locked.
C:\\sdk\\targets(100,5): warning MSB3026: Could not copy "A.dll". Beginning retry 2 in 1000ms. File locked.
C:\\sdk\\targets(100,5): warning MSB3026: Could not copy "A.dll". Beginning retry 3 in 1000ms. File locked.
C:\\sdk\\targets(100,5): warning MSB3026: Could not copy "B.dll". Beginning retry 1 in 1000ms. File locked.
C:\\sdk\\targets(100,5): error MSB3027: Could not copy "A.dll". Exceeded retry count of 10. Failed.`;
    const diagnostics = parseBuildOutput({ tool: 'dotnet.build', output });

    // Should dedupe the 3 A.dll retries into 1, keep 1 B.dll retry, and 1 error
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.filter((d) => d.code === 'MSB3026')).toHaveLength(2);
    expect(diagnostics.filter((d) => d.code === 'MSB3027')).toHaveLength(1);
  });
});
