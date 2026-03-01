import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dotnetRestorePlugin } from '../../../src/plugins/dotnet/dotnet-restore.js';
import * as executor from '../../../src/plugins/executor.js';

vi.mock('../../../src/plugins/executor.js');

describe('dotnetRestorePlugin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns empty diagnostics on successful restore', async () => {
    const cleanOutput = `
  Determining projects to restore...
  Restored /app/MyProject/MyProject.csproj (in 1.23 sec).
`;

    vi.mocked(executor.executeCommand).mockResolvedValue({
      exitCode: 0,
      output: cleanOutput,
    });

    const result = await dotnetRestorePlugin.execute({
      args: [],
      cwd: '/app',
      runWriter: undefined,
    });

    expect(result.success).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('returns error diagnostic when NuGet package is not found', async () => {
    const notFoundOutput = `
  Determining projects to restore...
/app/MyProject/MyProject.csproj : error NU1101: Unable to find package NonExistent.Package. No packages exist with this id in source(s): nuget.org [/app/MyProject/MyProject.csproj]

  Failed to restore /app/MyProject/MyProject.csproj (in 0.5 sec).
`;

    vi.mocked(executor.executeCommand).mockResolvedValue({
      exitCode: 1,
      output: notFoundOutput,
    });

    const result = await dotnetRestorePlugin.execute({
      args: [],
      cwd: '/app',
      runWriter: undefined,
    });

    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(1);

    expect(result.diagnostics[0]).toMatchObject({
      severity: 'error',
      code: 'NU1101',
      message: expect.stringContaining('Unable to find package'),
    });
  });

  it('returns warning diagnostic for version conflict', async () => {
    const warningOutput = `
  Determining projects to restore...
/app/MyProject/MyProject.csproj : warning NU1903: Package 'System.Text.Json' 6.0.0 has a known high severity vulnerability, https://github.com/advisories/GHSA-1234 [/app/MyProject/MyProject.csproj]
  Restored /app/MyProject/MyProject.csproj (in 0.8 sec).
`;

    vi.mocked(executor.executeCommand).mockResolvedValue({
      exitCode: 0,
      output: warningOutput,
    });

    const result = await dotnetRestorePlugin.execute({
      args: [],
      cwd: '/app',
      runWriter: undefined,
    });

    expect(result.success).toBe(true);
    expect(result.diagnostics).toHaveLength(1);

    expect(result.diagnostics[0]).toMatchObject({
      severity: 'warning',
      code: 'NU1903',
      message: expect.stringContaining('known high severity vulnerability'),
    });
  });

  it('passes custom args to dotnet restore command', async () => {
    vi.mocked(executor.executeCommand).mockResolvedValue({
      exitCode: 0,
      output: '',
    });

    await dotnetRestorePlugin.execute({
      args: ['--source', 'https://custom.feed/v3/index.json', '--no-cache'],
      cwd: '/app',
      runWriter: undefined,
    });

    expect(executor.executeCommand).toHaveBeenCalledWith({
      command: 'dotnet',
      args: ['restore', '--source', 'https://custom.feed/v3/index.json', '--no-cache'],
      cwd: '/app',
      runWriter: undefined,
    });
  });
});
