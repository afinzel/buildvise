import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dotnetTestPlugin } from '../../../src/plugins/dotnet/dotnet-test.js';
import * as executor from '../../../src/plugins/executor.js';

vi.mock('../../../src/plugins/executor.js');

describe('dotnetTestPlugin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns build errors in diagnostics when build fails', async () => {
    const buildErrorOutput = `
Microsoft (R) Build Engine version 17.0.0+c9eb9dd64 for .NET
Copyright (C) Microsoft Corporation. All rights reserved.

  Determining projects to restore...
  All projects are up-to-date for restore.
/app/Tests/CalculatorTests.cs(10,13): error CS0103: The name 'DoesNotExist' does not exist in the current context [/app/Tests/Tests.csproj]
/app/Tests/CalculatorTests.cs(15,5): error CS0021: Cannot apply indexing with [] to an expression of type 'int' [/app/Tests/Tests.csproj]

Build FAILED.
`;

    vi.mocked(executor.executeCommand).mockResolvedValue({
      exitCode: 1,
      output: buildErrorOutput,
    });

    const result = await dotnetTestPlugin.execute({
      args: [],
      cwd: '/app',
      runWriter: undefined,
    });

    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(2);

    expect(result.diagnostics[0]).toMatchObject({
      severity: 'error',
      code: 'CS0103',
      message: expect.stringContaining('DoesNotExist'),
      file: '/app/Tests/CalculatorTests.cs',
      line: 10,
      column: 13,
    });

    expect(result.diagnostics[1]).toMatchObject({
      severity: 'error',
      code: 'CS0021',
      message: expect.stringContaining('Cannot apply indexing'),
      file: '/app/Tests/CalculatorTests.cs',
      line: 15,
      column: 5,
    });
  });

  it('returns test failures in diagnostics when tests fail', async () => {
    const testFailureOutput = `
Test run for /app/Tests.dll (.NETCoreApp,Version=v6.0)
Starting test execution, please wait...
A total of 1 test files matched the specified pattern.

  Failed CalculatorTests.AddTest [42 ms]
  Error Message:
   Assert.Equal() Failure
  Stack Trace:
     at CalculatorTests.AddTest() in /app/Tests/CalculatorTests.cs:line 25

Failed!  - Failed:     1, Passed:     4, Skipped:     0, Total:     5
`;

    vi.mocked(executor.executeCommand).mockResolvedValue({
      exitCode: 1,
      output: testFailureOutput,
    });

    const result = await dotnetTestPlugin.execute({
      args: [],
      cwd: '/app',
      runWriter: undefined,
    });

    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(1);

    expect(result.diagnostics[0]).toMatchObject({
      severity: 'error',
      code: 'TestFailure',
      message: 'Assert.Equal() Failure',
      file: '/app/Tests/CalculatorTests.cs',
      line: 25,
    });
  });

  it('combines build errors and test failures from mixed output', async () => {
    const mixedOutput = `
/app/ProjectA/Test.cs(5,10): warning CS0168: The variable 'x' is declared but never used [/app/ProjectA/ProjectA.csproj]

Test run for /app/ProjectB/Tests.dll (.NETCoreApp,Version=v6.0)
Starting test execution, please wait...

  Failed SomeTest [10 ms]
  Error Message:
   Expected true but got false
  Stack Trace:
     at SomeTest() in /app/ProjectB/Tests.cs:line 30

Failed!  - Failed:     1, Passed:     2, Skipped:     0, Total:     3
`;

    vi.mocked(executor.executeCommand).mockResolvedValue({
      exitCode: 1,
      output: mixedOutput,
    });

    const result = await dotnetTestPlugin.execute({
      args: [],
      cwd: '/app',
      runWriter: undefined,
    });

    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(2);

    expect(result.diagnostics[0]).toMatchObject({
      severity: 'warning',
      code: 'CS0168',
      file: '/app/ProjectA/Test.cs',
      line: 5,
    });

    expect(result.diagnostics[1]).toMatchObject({
      severity: 'error',
      code: 'TestFailure',
      message: 'Expected true but got false',
      file: '/app/ProjectB/Tests.cs',
      line: 30,
    });
  });

  it('returns empty diagnostics when all tests pass', async () => {
    const passingOutput = `
Test run for /app/Tests.dll (.NETCoreApp,Version=v6.0)
Starting test execution, please wait...
A total of 1 test files matched the specified pattern.

Passed!  - Failed:     0, Passed:     5, Skipped:     0, Total:     5
`;

    vi.mocked(executor.executeCommand).mockResolvedValue({
      exitCode: 0,
      output: passingOutput,
    });

    const result = await dotnetTestPlugin.execute({
      args: [],
      cwd: '/app',
      runWriter: undefined,
    });

    expect(result.success).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('includes test summary in response', async () => {
    const output = `
Test run for /app/Tests.dll (.NETCoreApp,Version=v6.0)
Passed!  - Failed:     0, Passed:    10, Skipped:     2, Total:    12
`;

    vi.mocked(executor.executeCommand).mockResolvedValue({
      exitCode: 0,
      output,
    });

    const result = await dotnetTestPlugin.execute({
      args: [],
      cwd: '/app',
      runWriter: undefined,
    });

    expect(result.summary).toEqual({
      passed: 10,
      failed: 0,
      skipped: 2,
      total: 12,
    });
  });

  it('includes projectsBuildFailed count in summary', async () => {
    const output = `
/app/Tests/Test.cs(10,5): error CS0103: Name does not exist [/app/MyProject.Tests.csproj]
`;

    vi.mocked(executor.executeCommand).mockResolvedValue({
      exitCode: 1,
      output,
    });

    const result = await dotnetTestPlugin.execute({
      args: [],
      cwd: '/app',
      runWriter: undefined,
    });

    expect(result.summary).toMatchObject({
      projectsBuildFailed: 1,
    });

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      severity: 'error',
      code: 'CS0103',
    });
  });
});
