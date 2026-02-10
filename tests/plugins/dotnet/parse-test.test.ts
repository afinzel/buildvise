import { describe, it, expect } from 'vitest';
import { parseTestOutput, parseDotnetTestSummary } from '../../../src/plugins/dotnet/parse-test.js';

describe('parseTestOutput', () => {
  it('returns empty array for passing tests', () => {
    const output = `
Test run for /app/tests.dll (.NETCoreApp,Version=v6.0)
Starting test execution, please wait...
A total of 1 test files matched the specified pattern.

Passed!  - Failed:     0, Passed:     5, Skipped:     0, Total:     5
`;
    const diagnostics = parseTestOutput({ tool: 'dotnet.test', output });

    expect(diagnostics).toEqual([]);
  });

  it('parses failed test with error message', () => {
    const output = `
  Failed CalculatorTests.AddTest [42 ms]
  Error Message:
   Assert.Equal() Failure
  Stack Trace:
     at CalculatorTests.AddTest() in /app/tests/CalculatorTests.cs:line 25

`;
    const diagnostics = parseTestOutput({ tool: 'dotnet.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].code).toBe('TestFailure');
    expect(diagnostics[0].message).toBe('Assert.Equal() Failure');
    expect(diagnostics[0].file).toBe('/app/tests/CalculatorTests.cs');
    expect(diagnostics[0].line).toBe(25);
  });

  it('parses multiple failed tests', () => {
    const output = `
  Failed TestA [10 ms]
  Error Message:
   Error A
  Stack Trace:
     at TestA() in /app/A.cs:line 10

  Failed TestB [20 ms]
  Error Message:
   Error B
  Stack Trace:
     at TestB() in /app/B.cs:line 20

`;
    const diagnostics = parseTestOutput({ tool: 'dotnet.test', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].message).toBe('Error A');
    expect(diagnostics[0].file).toBe('/app/A.cs');
    expect(diagnostics[1].message).toBe('Error B');
    expect(diagnostics[1].file).toBe('/app/B.cs');
  });

  it('handles test failure without stack trace', () => {
    const output = `
  Failed SomeTest [5 ms]
  Error Message:
   Test failed for unknown reason

`;
    const diagnostics = parseTestOutput({ tool: 'dotnet.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Test failed for unknown reason');
    expect(diagnostics[0].file).toBeUndefined();
    expect(diagnostics[0].line).toBeUndefined();
  });

  it('sets correct log range', () => {
    const output = `Line 1
  Failed TestA [10 ms]
  Error Message:
   Error message
  Stack Trace:
     at Test() in /app/test.cs:line 1

Line 8`;
    const diagnostics = parseTestOutput({ tool: 'dotnet.test', output });

    expect(diagnostics[0].logRange.startLine).toBe(2);
    expect(diagnostics[0].logRange.endLine).toBeGreaterThan(2);
  });
});

describe('parseDotnetTestSummary', () => {
  it('returns undefined for output without summary', () => {
    const output = `
Test run for /app/tests.dll (.NETCoreApp,Version=v6.0)
Starting test execution, please wait...
`;
    const summary = parseDotnetTestSummary(output);
    expect(summary).toBeUndefined();
  });

  it('parses passed summary', () => {
    const output = `
Test run for /app/tests.dll (.NETCoreApp,Version=v6.0)
Starting test execution, please wait...
A total of 1 test files matched the specified pattern.

Passed!  - Failed:     0, Passed:    11, Skipped:     0, Total:    11
`;
    const summary = parseDotnetTestSummary(output);

    expect(summary).toEqual({
      passed: 11,
      failed: 0,
      skipped: 0,
      total: 11,
    });
  });

  it('parses failed summary', () => {
    const output = `
Test run for /app/tests.dll (.NETCoreApp,Version=v6.0)
Starting test execution, please wait...

Failed!  - Failed:     2, Passed:     9, Skipped:     1, Total:    12
`;
    const summary = parseDotnetTestSummary(output);

    expect(summary).toEqual({
      passed: 9,
      failed: 2,
      skipped: 1,
      total: 12,
    });
  });

  it('handles varied spacing in summary', () => {
    const output = `Passed!  - Failed:  0, Passed:  5, Skipped:  0, Total:  5`;
    const summary = parseDotnetTestSummary(output);

    expect(summary).toEqual({
      passed: 5,
      failed: 0,
      skipped: 0,
      total: 5,
    });
  });

  it('aggregates results from multiple projects', () => {
    const output = `
Test run for /app/ProjectA/tests.dll (.NETCoreApp,Version=v6.0)
Starting test execution, please wait...
A total of 1 test files matched the specified pattern.

Passed!  - Failed:     0, Passed:     5, Skipped:     1, Total:     6

Test run for /app/ProjectB/tests.dll (.NETCoreApp,Version=v6.0)
Starting test execution, please wait...
A total of 1 test files matched the specified pattern.

Failed!  - Failed:     2, Passed:     8, Skipped:     0, Total:    10
`;
    const summary = parseDotnetTestSummary(output);

    expect(summary).toEqual({
      passed: 13,
      failed: 2,
      skipped: 1,
      total: 16,
    });
  });

  it('counts projects with build errors', () => {
    const output = `
Test run for /app/ProjectA.Tests/bin/ProjectA.Tests.dll (.NETCoreApp,Version=v10.0)
Starting test execution, please wait...

Passed!  - Failed:     0, Passed:     5, Skipped:     0, Total:     5

/app/ProjectB.Tests/SomeTest.cs(10,5): error CS0021: Cannot apply indexing [/app/ProjectB.Tests/ProjectB.Tests.csproj]
/app/ProjectB.Tests/OtherTest.cs(20,5): error CS0103: Name does not exist [/app/ProjectB.Tests/ProjectB.Tests.csproj]
`;
    const summary = parseDotnetTestSummary(output);

    expect(summary).toEqual({
      passed: 5,
      failed: 0,
      skipped: 0,
      total: 5,
      projectsBuildFailed: 1,
    });
  });

  it('counts multiple projects with build errors', () => {
    const output = `
Passed!  - Failed:     0, Passed:     5, Skipped:     0, Total:     5

/app/ProjectA.Tests/Test.cs(10,5): error CS0021: Error [/app/ProjectA.Tests/ProjectA.Tests.csproj]
/app/ProjectB.Tests/Test.cs(10,5): error CS0103: Error [/app/ProjectB.Tests/ProjectB.Tests.csproj]
`;
    const summary = parseDotnetTestSummary(output);

    expect(summary).toEqual({
      passed: 5,
      failed: 0,
      skipped: 0,
      total: 5,
      projectsBuildFailed: 2,
    });
  });

  it('returns summary with only build errors (no successful tests)', () => {
    const output = `
/app/Tests/Test.cs(10,5): error CS0021: Error [/app/Tests/MyProject.Tests.csproj]
`;
    const summary = parseDotnetTestSummary(output);

    expect(summary).toEqual({
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      projectsBuildFailed: 1,
    });
  });
});
