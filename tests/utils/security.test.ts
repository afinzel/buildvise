import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateShellPath,
  validateCwd,
  validateScriptName,
  validateEslintArgs,
  validateRunFilename,
} from '../../src/utils/security.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Use home directory for temp dirs to avoid /var sensitivity check on macOS
// (os.tmpdir() resolves to /private/var/folders/... on macOS)
const SAFE_TMP_BASE = path.join(os.homedir(), '.buildvise-test-tmp');

describe('validateShellPath', () => {
  it('returns allowed shell unchanged', () => {
    expect(validateShellPath('/bin/bash')).toBe('/bin/bash');
    expect(validateShellPath('/bin/zsh')).toBe('/bin/zsh');
    expect(validateShellPath('/bin/sh')).toBe('/bin/sh');
    expect(validateShellPath('/bin/dash')).toBe('/bin/dash');
    expect(validateShellPath('/usr/bin/bash')).toBe('/usr/bin/bash');
    expect(validateShellPath('/usr/bin/zsh')).toBe('/usr/bin/zsh');
  });

  it('returns /bin/sh for undefined', () => {
    expect(validateShellPath(undefined)).toBe('/bin/sh');
  });

  it('returns /bin/sh for disallowed shells', () => {
    expect(validateShellPath('/usr/local/bin/fish')).toBe('/bin/sh');
    expect(validateShellPath('/tmp/evil')).toBe('/bin/sh');
    expect(validateShellPath('bash')).toBe('/bin/sh');
    expect(validateShellPath('')).toBe('/bin/sh');
  });

  it('returns /bin/sh for shell injection attempts', () => {
    expect(validateShellPath('/bin/bash; rm -rf /')).toBe('/bin/sh');
    expect(validateShellPath('/bin/bash\nmalicious')).toBe('/bin/sh');
  });
});

describe('validateCwd', () => {
  let tmpDir: string;

  beforeEach(() => {
    fs.mkdirSync(SAFE_TMP_BASE, { recursive: true });
    tmpDir = fs.mkdtempSync(path.join(SAFE_TMP_BASE, 'cwd-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('accepts valid existing directory', () => {
    expect(() => validateCwd(tmpDir, undefined, tmpDir)).not.toThrow();
  });

  it('throws for non-existent directory', () => {
    expect(() =>
      validateCwd('/nonexistent/path/abc123', undefined, tmpDir)
    ).toThrow('does not exist');
  });

  it('throws for sensitive system directories', () => {
    const sensitiveDirs = ['/etc', '/usr', '/bin', '/sbin', '/var'];
    for (const dir of sensitiveDirs) {
      if (fs.existsSync(dir)) {
        expect(() => validateCwd(dir, undefined, tmpDir)).toThrow('sensitive');
      }
    }
  });

  it('throws when relative path resolves outside default', () => {
    const subDir = path.join(tmpDir, 'sub');
    fs.mkdirSync(subDir);
    expect(() => validateCwd(tmpDir, '..', subDir)).toThrow('outside default');
  });

  it('accepts relative path that stays within default', () => {
    const subDir = path.join(tmpDir, 'sub');
    fs.mkdirSync(subDir);
    expect(() => validateCwd(subDir, 'sub', tmpDir)).not.toThrow();
  });

  it('accepts absolute path regardless of default', () => {
    expect(() => validateCwd(tmpDir, tmpDir, '/some/other/default')).not.toThrow();
  });
});

describe('validateScriptName', () => {
  it('accepts valid script names', () => {
    expect(() => validateScriptName('build')).not.toThrow();
    expect(() => validateScriptName('test:unit')).not.toThrow();
    expect(() => validateScriptName('pre-build')).not.toThrow();
    expect(() => validateScriptName('@scope/name')).not.toThrow();
    expect(() => validateScriptName('my.script')).not.toThrow();
    expect(() => validateScriptName('build_prod')).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => validateScriptName('')).toThrow('must not be empty');
  });

  it('rejects shell metacharacters', () => {
    expect(() => validateScriptName('build; rm -rf /')).toThrow('Invalid script name');
    expect(() => validateScriptName('build && echo hacked')).toThrow('Invalid script name');
    expect(() => validateScriptName('build | cat /etc/passwd')).toThrow('Invalid script name');
    expect(() => validateScriptName('$(whoami)')).toThrow('Invalid script name');
    expect(() => validateScriptName('`whoami`')).toThrow('Invalid script name');
    expect(() => validateScriptName('build > /tmp/out')).toThrow('Invalid script name');
  });

  it('rejects whitespace', () => {
    expect(() => validateScriptName('build test')).toThrow('Invalid script name');
    expect(() => validateScriptName('build\ttest')).toThrow('Invalid script name');
  });
});

describe('validateEslintArgs', () => {
  it('accepts safe arguments', () => {
    expect(() => validateEslintArgs(['src/', '--ext', '.ts'])).not.toThrow();
    expect(() => validateEslintArgs(['--max-warnings', '0'])).not.toThrow();
    expect(() => validateEslintArgs(['--fix'])).not.toThrow();
    expect(() => validateEslintArgs([])).not.toThrow();
  });

  it('rejects --config flag', () => {
    expect(() => validateEslintArgs(['--config', 'evil.js'])).toThrow('Blocked ESLint flag');
  });

  it('rejects -c flag', () => {
    expect(() => validateEslintArgs(['-c', 'evil.js'])).toThrow('Blocked ESLint flag');
  });

  it('rejects --rulesdir flag', () => {
    expect(() => validateEslintArgs(['--rulesdir', '/tmp/evil'])).toThrow('Blocked ESLint flag');
  });

  it('rejects --plugin flag', () => {
    expect(() => validateEslintArgs(['--plugin', 'evil-plugin'])).toThrow('Blocked ESLint flag');
  });

  it('rejects --resolve-plugins-relative-to flag', () => {
    expect(() =>
      validateEslintArgs(['--resolve-plugins-relative-to', '/tmp'])
    ).toThrow('Blocked ESLint flag');
  });

  it('rejects dangerous flag mixed with safe args', () => {
    expect(() =>
      validateEslintArgs(['src/', '--max-warnings', '0', '--config', 'evil.js'])
    ).toThrow('Blocked ESLint flag');
  });
});

describe('validateRunFilename', () => {
  const allowed = new Set(['raw.log', 'raw.index.json', 'diagnostics.json', 'meta.json']);

  it('accepts known filenames', () => {
    expect(() => validateRunFilename('raw.log', allowed)).not.toThrow();
    expect(() => validateRunFilename('diagnostics.json', allowed)).not.toThrow();
    expect(() => validateRunFilename('meta.json', allowed)).not.toThrow();
    expect(() => validateRunFilename('raw.index.json', allowed)).not.toThrow();
  });

  it('rejects unknown filenames', () => {
    expect(() => validateRunFilename('evil.txt', allowed)).toThrow('Unknown run file');
    expect(() => validateRunFilename('../../etc/passwd', allowed)).toThrow('path separators');
  });

  it('rejects path separators', () => {
    expect(() => validateRunFilename('../raw.log', allowed)).toThrow('path separators');
    expect(() => validateRunFilename('sub/raw.log', allowed)).toThrow('path separators');
    expect(() => validateRunFilename('..\\raw.log', allowed)).toThrow('path separators');
  });
});
