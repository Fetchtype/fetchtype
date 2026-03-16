import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runCli } from './index.js';

type CapturedIo = {
  io: {
    stdout: (text: string) => void;
    stderr: (text: string) => void;
  };
  getStdout: () => string;
  getStderr: () => string;
};

const tempDirectories: string[] = [];

function createCapturedIo(): CapturedIo {
  let stdout = '';
  let stderr = '';

  return {
    io: {
      stdout: (text) => {
        stdout += text;
      },
      stderr: (text) => {
        stderr += text;
      },
    },
    getStdout: () => stdout,
    getStderr: () => stderr,
  };
}

async function createTempDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'fetchtype-'));
  tempDirectories.push(directory);
  return directory;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('runCli', () => {
  it('writes a starter token file with init', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();
    const exitCode = await runCli(['init', 'starter.tokens.json'], io.io, directory);

    const contents = JSON.parse(await readFile(join(directory, 'starter.tokens.json'), 'utf8'));

    expect(exitCode).toBe(0);
    expect(contents.typography.body.fontSize).toBe('1rem');
    expect(contents.themes).toHaveLength(2);
    expect(io.getStdout()).toContain('Created');
  });

  it('validates the starter token file', async () => {
    const directory = await createTempDirectory();
    const initIo = createCapturedIo();
    const validateIo = createCapturedIo();

    await runCli(['init', 'starter.tokens.json'], initIo.io, directory);
    const exitCode = await runCli(
      ['validate', '--input', 'starter.tokens.json'],
      validateIo.io,
      directory,
    );

    expect(exitCode).toBe(0);
    expect(validateIo.getStdout()).toContain('Validation passed');
  });

  it('returns a validation exit code for inaccessible contrast', async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, 'bad.tokens.json');
    const io = createCapturedIo();

    await runCli(['init', 'bad.tokens.json'], createCapturedIo().io, directory);
    const tokenSet = JSON.parse(await readFile(filePath, 'utf8'));
    tokenSet.color.light.text.primary.value = '#9ca3af';
    await writeFile(filePath, `${JSON.stringify(tokenSet, null, 2)}\n`, 'utf8');

    const exitCode = await runCli(['validate', '--input', 'bad.tokens.json'], io.io, directory);

    expect(exitCode).toBe(1);
    expect(io.getStdout()).toContain('contrast.text-primary.light');
  });

  it('emits GitHub summaries and annotations for review flows', async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, 'bad.tokens.json');
    const summaryPath = join(directory, 'step-summary.md');
    const io = createCapturedIo();
    const previousSummaryPath = process.env.GITHUB_STEP_SUMMARY;

    await runCli(['init', 'bad.tokens.json'], createCapturedIo().io, directory);
    const tokenSet = JSON.parse(await readFile(filePath, 'utf8'));
    tokenSet.color.light.text.primary.value = '#9ca3af';
    await writeFile(filePath, `${JSON.stringify(tokenSet, null, 2)}\n`, 'utf8');

    process.env.GITHUB_STEP_SUMMARY = summaryPath;

    try {
      const exitCode = await runCli(
        ['validate', '--input', 'bad.tokens.json', '--github'],
        io.io,
        directory,
      );
      const summary = await readFile(summaryPath, 'utf8');

      expect(exitCode).toBe(1);
      expect(io.getStdout()).toContain('Validation failed');
      expect(io.getStderr()).toContain(
        '::error title=fetchtype contrast.text-primary.light,file=bad.tokens.json::',
      );
      expect(summary).toContain('## Fetchtype Validation Failed');
      expect(summary).toContain('| error | 7 |');
    } finally {
      if (previousSummaryPath === undefined) {
        delete process.env.GITHUB_STEP_SUMMARY;
      } else {
        process.env.GITHUB_STEP_SUMMARY = previousSummaryPath;
      }
    }
  });

  it('writes a dashboard preset with init --preset dashboard', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();
    const exitCode = await runCli(
      ['init', 'dashboard.tokens.json', '--preset', 'dashboard'],
      io.io,
      directory,
    );

    const contents = JSON.parse(
      await readFile(join(directory, 'dashboard.tokens.json'), 'utf8'),
    );

    expect(exitCode).toBe(0);
    expect(contents.typography.body.fontSize).toBe('0.875rem');
    expect(contents.hierarchy.scale).toBe('minor-second');
    expect(io.getStdout()).toContain('Created');
  });

  it('validates a dashboard preset token file', async () => {
    const directory = await createTempDirectory();
    const initIo = createCapturedIo();
    const validateIo = createCapturedIo();

    await runCli(
      ['init', 'dashboard.tokens.json', '--preset', 'dashboard'],
      initIo.io,
      directory,
    );
    const exitCode = await runCli(
      ['validate', '--input', 'dashboard.tokens.json'],
      validateIo.io,
      directory,
    );

    expect(exitCode).toBe(0);
    expect(validateIo.getStdout()).toContain('Validation passed');
  });

  it('fails with an error for a nonexistent preset', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();
    const exitCode = await runCli(
      ['init', 'out.tokens.json', '--preset', 'nonexistent'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(2);
    expect(io.getStderr()).toContain('Unknown preset');
    expect(io.getStderr()).toContain('nonexistent');
    expect(await exists(join(directory, 'out.tokens.json'))).toBe(false);
  });

  it('builds only CSS artifacts when format is css', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();

    await runCli(['init', 'starter.tokens.json'], createCapturedIo().io, directory);
    const exitCode = await runCli(
      ['build', '--input', 'starter.tokens.json', '--out-dir', 'dist/out', '--format', 'css'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(0);
    expect(await exists(join(directory, 'dist/out/tokens.css'))).toBe(true);
    expect(await exists(join(directory, 'dist/out/tokens.json'))).toBe(false);
    expect(io.getStdout()).toContain('tokens.css');
  });

  it('builds a tailwind.config.ts when format is tailwind', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();

    await runCli(['init', 'starter.tokens.json'], createCapturedIo().io, directory);
    const exitCode = await runCli(
      ['build', '--input', 'starter.tokens.json', '--out-dir', 'dist/out', '--format', 'tailwind'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(0);
    expect(await exists(join(directory, 'dist/out/tailwind.config.ts'))).toBe(true);
    expect(io.getStdout()).toContain('tailwind.config.ts');

    const contents = await readFile(join(directory, 'dist/out/tailwind.config.ts'), 'utf8');
    expect(contents).toContain('fontSize');
    expect(contents).toContain('fontFamily');
  });

  it('builds a report.html when --report is set', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();

    await runCli(['init', 'starter.tokens.json'], createCapturedIo().io, directory);
    const exitCode = await runCli(
      ['build', '--input', 'starter.tokens.json', '--out-dir', 'dist/out', '--report'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(0);
    expect(await exists(join(directory, 'dist/out/report.html'))).toBe(true);
    expect(io.getStdout()).toContain('report.html');

    const contents = await readFile(join(directory, 'dist/out/report.html'), 'utf8');
    expect(contents).toContain('<!DOCTYPE html>');
    expect(contents).toContain('Heading Hierarchy');
    expect(contents).toContain('Color Palette');
  });

  it('builds a shadcn.css when format is shadcn', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();

    await runCli(['init', 'starter.tokens.json'], createCapturedIo().io, directory);
    const exitCode = await runCli(
      ['build', '--input', 'starter.tokens.json', '--out-dir', 'dist/out', '--format', 'shadcn'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(0);
    expect(await exists(join(directory, 'dist/out/shadcn.css'))).toBe(true);
    expect(io.getStdout()).toContain('shadcn.css');

    const contents = await readFile(join(directory, 'dist/out/shadcn.css'), 'utf8');
    expect(contents).toContain('--background:');
    expect(contents).toContain('.dark {');
  });

  it('suggests fonts for a given context', async () => {
    const io = createCapturedIo();
    const directory = await createTempDirectory();
    const exitCode = await runCli(
      ['suggest', '--context', 'interface'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(0);
    const output = io.getStdout();
    expect(output).toContain('Family');
    expect(output).toContain('Category');
  });

  it('suggests fonts as JSON', async () => {
    const io = createCapturedIo();
    const directory = await createTempDirectory();
    const exitCode = await runCli(
      ['suggest', '--context', 'mono', '--json'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.getStdout());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].family).toBeTruthy();
  });

  it('rejects invalid suggest context', async () => {
    const io = createCapturedIo();
    const directory = await createTempDirectory();
    const exitCode = await runCli(
      ['suggest', '--context', 'invalid'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(2);
    expect(io.getStderr()).toContain('Invalid context');
  });

  it('respects --variable-only flag in suggest', async () => {
    const io = createCapturedIo();
    const directory = await createTempDirectory();
    const exitCode = await runCli(
      ['suggest', '--context', 'mono', '--variable-only', '--json'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.getStdout());
    for (const suggestion of parsed) {
      expect(suggestion.variable).toBe(true);
    }
  });

  it('builds tokens.w3c.json when format is w3c', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();

    await runCli(['init', 'starter.tokens.json'], createCapturedIo().io, directory);
    const exitCode = await runCli(
      ['build', '--input', 'starter.tokens.json', '--out-dir', 'dist/out', '--format', 'w3c'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(0);
    expect(await exists(join(directory, 'dist/out/tokens.w3c.json'))).toBe(true);
    expect(io.getStdout()).toContain('tokens.w3c.json');

    const contents = JSON.parse(await readFile(join(directory, 'dist/out/tokens.w3c.json'), 'utf8'));
    expect(contents.color.light.text.primary.$type).toBe('color');
    expect(contents.color.light.text.primary.$value).toBeDefined();
    expect(contents.typography.body.$type).toBe('typography');
    expect(contents.typography.body.$value).toBeDefined();
  });

  it('imports a W3C token file and produces valid fetchtype tokens', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();

    // First, create a W3C file by exporting from a starter token set
    await runCli(['init', 'starter.tokens.json'], createCapturedIo().io, directory);
    await runCli(
      ['build', '--input', 'starter.tokens.json', '--out-dir', 'dist/out', '--format', 'w3c'],
      createCapturedIo().io,
      directory,
    );

    // Now import the W3C file
    const exitCode = await runCli(
      ['import', '--input', 'dist/out/tokens.w3c.json', '--output', 'imported.tokens.json'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(0);
    expect(io.getStdout()).toContain('Imported');
    expect(await exists(join(directory, 'imported.tokens.json'))).toBe(true);

    // Validate the imported tokens
    const validateIo = createCapturedIo();
    const validateExit = await runCli(
      ['validate', '--input', 'imported.tokens.json'],
      validateIo.io,
      directory,
    );
    expect(validateExit).toBe(0);
    expect(validateIo.getStdout()).toContain('Validation passed');
  });

  it('creates valid tokens with init --prompt "dashboard app"', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();
    const exitCode = await runCli(
      ['init', 'prompted.tokens.json', '--prompt', 'dashboard app'],
      io.io,
      directory,
    );

    expect(exitCode).toBe(0);
    expect(io.getStdout()).toContain('Created');
    expect(io.getStderr()).toContain('dashboard');

    // Validate the generated tokens
    const validateIo = createCapturedIo();
    const validateExit = await runCli(
      ['validate', '--input', 'prompted.tokens.json'],
      validateIo.io,
      directory,
    );
    expect(validateExit).toBe(0);
    expect(validateIo.getStdout()).toContain('Validation passed');
  });

  it('check passes with valid tokens and exits 0', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();

    await runCli(['init', 'tokens.json'], createCapturedIo().io, directory);
    const exitCode = await runCli(['check', 'tokens.json'], io.io, directory);

    expect(exitCode).toBe(0);
    const output = io.getStdout();
    expect(output).toContain('✓ fetchtype:');
    // Should not contain detailed diagnostics
    expect(output).not.toContain('Validation passed');
    expect(output).not.toContain('ERROR');
  });

  it('check fails with invalid tokens and exits 1', async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, 'tokens.json');
    const io = createCapturedIo();

    await runCli(['init', 'tokens.json'], createCapturedIo().io, directory);
    const tokenSet = JSON.parse(await readFile(filePath, 'utf8'));
    tokenSet.color.light.text.primary.value = '#9ca3af';
    await writeFile(filePath, `${JSON.stringify(tokenSet, null, 2)}\n`, 'utf8');

    const exitCode = await runCli(['check', 'tokens.json'], io.io, directory);

    expect(exitCode).toBe(1);
    const output = io.getStdout();
    expect(output).toContain('✗ fetchtype:');
    expect(output).toContain('error');
    // Should not contain detailed diagnostics
    expect(output).not.toContain('contrast.text-primary.light');
    expect(output).not.toContain('Validation failed');
  });

  it('check installs a pre-commit hook into .git/hooks', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();

    // Create a fake .git/hooks directory
    const gitHooksDir = join(directory, '.git', 'hooks');
    await import('node:fs/promises').then(({ mkdir }) => mkdir(gitHooksDir, { recursive: true }));

    const exitCode = await runCli(['check', '--install-hook'], io.io, directory);

    expect(exitCode).toBe(0);
    expect(io.getStdout()).toContain('Installed');
    expect(io.getStdout()).toContain('pre-commit');

    const hookPath = join(gitHooksDir, 'pre-commit');
    expect(await exists(hookPath)).toBe(true);
    const hookContent = await readFile(hookPath, 'utf8');
    expect(hookContent).toContain('npx fetchtype check');
  });

  it('check installs a husky hook when .husky directory exists', async () => {
    const directory = await createTempDirectory();
    const io = createCapturedIo();

    // Create a fake .husky directory (husky takes precedence)
    const huskyDir = join(directory, '.husky');
    await import('node:fs/promises').then(({ mkdir }) => mkdir(huskyDir, { recursive: true }));

    const exitCode = await runCli(['check', '--install-hook'], io.io, directory);

    expect(exitCode).toBe(0);
    expect(io.getStdout()).toContain('Installed');

    const hookPath = join(huskyDir, 'pre-commit');
    expect(await exists(hookPath)).toBe(true);
    const hookContent = await readFile(hookPath, 'utf8');
    expect(hookContent).toContain('npx fetchtype check');
  });
});
