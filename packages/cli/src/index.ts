import { access, appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import chalk from 'chalk';
import { Command, CommanderError, Option } from 'commander';
import { lilconfig } from 'lilconfig';

import {
  buildTokenArtifacts,
  DEFAULT_TOKEN_SET,
  exportW3cTokens,
  formatSarifReport,
  generateHtmlReport,
  generateShadcnCss,
  generateTailwindConfig,
  getPreset,
  importW3cTokens,
  parseDesignTokenSet,
  PRESET_NAMES,
  prepareFont,
  queryTypographySystems,
  validateDesignTokenSet,
  validateFonts,
  auditDirectory,
  auditUrl,
  formatAuditReport,
  generateCorrectedTokens,
  detectDrift,
  resolveConfig,
  generateTokenSet,
  type AuditResult,
  type PrepareManifest,
  type DriftReport,
} from '@fetchtype/core';
import { suggestFonts, type SuggestionContext, resolveFont, searchRegistry, registryStats, recommendPairings } from '@fetchtype/fonts';
import { generateFallbackCSS } from '@fetchtype/core';
import { startMcpServer } from './mcp.js';
import { startPreviewServer } from './preview.js';
import { resolvePromptToTokenSet } from './prompt-init.js';
import {
  type FetchTypeConfig,
  type TypographyPattern,
  type TypographySystemQueryKind,
  type TypographySystemReference,
  type TypographySystemsResult,
  type ValidationReport,
} from '@fetchtype/types';

type Logger = {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
};

type BuildFormat = 'all' | 'css' | 'json' | 'tailwind' | 'shadcn' | 'w3c';
type DiagnosticLevel = 'error' | 'warning' | 'notice';

const defaultLogger: Logger = {
  stdout: (text) => {
    process.stdout.write(text);
  },
  stderr: (text) => {
    process.stderr.write(text);
  },
};

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadJsonFile(path: string): Promise<unknown> {
  const contents = await readFile(path, 'utf8');
  return JSON.parse(contents);
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function loadConfig(cwd: string): Promise<FetchTypeConfig | undefined> {
  const explorer = lilconfig('fetchtype', {
    searchPlaces: ['fetchtype.config.json', '.fetchtyperc.json', '.fetchtyperc'],
  });
  const result = await explorer.search(cwd);
  return result ? resolveConfig(result.config) : undefined;
}

function formatReport(report: ValidationReport): string {
  const lines = [`Validation ${report.pass ? 'passed' : 'failed'}.`];

  if (report.diagnostics.length === 0) {
    lines.push('No diagnostics found.');
    if ((report.references ?? []).length > 0) {
      lines.push('', ...formatReferenceEvaluations(report));
    }
    return `${lines.join('\n')}\n`;
  }

  for (const diagnostic of report.diagnostics) {
    const actual = diagnostic.actual ? ` (${diagnostic.actual})` : '';
    lines.push(
      `- ${diagnostic.severity.toUpperCase()} ${diagnostic.rule} ${diagnostic.path || '<root>'}: ${diagnostic.message}${actual}`,
    );
  }

  lines.push(
    `Errors: ${report.counts.error}, warnings: ${report.counts.warning}, info: ${report.counts.info}`,
  );

  if (report.references && (report.references ?? []).length > 0) {
    lines.push('', ...formatReferenceEvaluations(report));
  }

  return `${lines.join('\n')}\n`;
}

function formatReferenceEvaluations(report: ValidationReport): string[] {
  const refs = report.references ?? [];
  const lines = [`Reference evaluations (${refs.length})`];

  for (const reference of refs) {
    lines.push(`- ${reference.referenceName}: ${reference.score}%`);
    if (reference.matched.length > 0) {
      lines.push(`  Matches: ${reference.matched.slice(0, 3).join('; ')}`);
    }
    if (reference.mismatched.length > 0) {
      lines.push(`  Gaps: ${reference.mismatched.slice(0, 3).join('; ')}`);
    }
  }

  return lines;
}

function formatSystemReference(system: TypographySystemReference): string[] {
  return [
    `- ${system.name} [${system.kind}]`,
    `  Use cases: ${system.useCases.join(', ')}`,
    `  Styles: ${system.styles.join(', ')}`,
    `  Keywords: ${system.keywords.join(', ')}`,
    `  Fonts: ${system.fonts.join(', ')}`,
    `  Notes: ${system.summary}`,
    `  Source: ${system.source}${system.sourceUrl ? ` (${system.sourceUrl})` : ''}`,
  ];
}

function formatPattern(pattern: TypographyPattern): string[] {
  return [
    `- ${pattern.name}`,
    `  Summary: ${pattern.summary}`,
    `  Keywords: ${pattern.keywords.join(', ')}`,
    `  Evidence: ${pattern.evidence.join(', ')}`,
  ];
}

function formatTypographySystemsResult(
  result: TypographySystemsResult,
  patternsOnly: boolean,
): string {
  const lines: string[] = [];

  if (!patternsOnly) {
    lines.push(`Typography systems (${result.systems.length})`);

    if (result.systems.length === 0) {
      lines.push('No systems matched the provided filters.');
    } else {
      for (const system of result.systems) {
        lines.push(...formatSystemReference(system));
      }
    }
  }

  if (result.patterns.length > 0) {
    if (lines.length > 0) {
      lines.push('');
    }
    lines.push(`Extracted patterns (${result.patterns.length})`);
    for (const pattern of result.patterns) {
      lines.push(...formatPattern(pattern));
    }
  } else if (patternsOnly) {
    lines.push('No patterns matched the provided filters.');
  }

  lines.push('');
  lines.push(`Available use cases: ${result.availableUseCases.join(', ')}`);
  lines.push(`Available styles: ${result.availableStyles.join(', ')}`);

  return `${lines.join('\n')}\n`;
}

function escapeGithubCommandData(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function escapeGithubCommandProperty(value: string): string {
  return escapeGithubCommandData(value).replace(/,/g, '%2C').replace(/:/g, '%3A');
}

function toGithubDiagnosticLevel(
  severity: ValidationReport['diagnostics'][number]['severity'],
): DiagnosticLevel {
  if (severity === 'error') {
    return 'error';
  }

  if (severity === 'warning') {
    return 'warning';
  }

  return 'notice';
}

function formatGithubSummary(report: ValidationReport, source: string): string {
  const lines = [
    `## Fetchtype Validation ${report.pass ? 'Passed' : 'Failed'}`,
    '',
    `Source: \`${source}\``,
    '',
    '| Level | Count |',
    '| --- | ---: |',
    `| error | ${report.counts.error} |`,
    `| warning | ${report.counts.warning} |`,
    `| info | ${report.counts.info} |`,
  ];

  if (report.diagnostics.length === 0) {
    lines.push('', 'No diagnostics found.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('', '### Diagnostics', '');

  for (const diagnostic of report.diagnostics) {
    const actual = diagnostic.actual ? ` (actual: ${diagnostic.actual})` : '';
    const location = diagnostic.path ? ` at \`${diagnostic.path}\`` : '';
    lines.push(
      `- [${diagnostic.severity}] \`${diagnostic.rule}\`${location}: ${diagnostic.message}${actual}`,
    );
  }

  if (report.references && (report.references ?? []).length > 0) {
    lines.push('', '### Reference Evaluations', '');
    for (const reference of report.references) {
      lines.push(`- \`${reference.referenceId}\`: ${reference.score}%`);
      lines.push(`  ${reference.summary}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function emitGithubReport(
  report: ValidationReport,
  source: string,
  logger: Logger,
): Promise<void> {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;

  if (summaryPath) {
    await appendFile(summaryPath, formatGithubSummary(report, source), 'utf8');
  }

  for (const diagnostic of report.diagnostics) {
    const level = toGithubDiagnosticLevel(diagnostic.severity);
    const title = escapeGithubCommandProperty(`fetchtype ${diagnostic.rule}`);
    const file = escapeGithubCommandProperty(source);
    const message = escapeGithubCommandData(
      `${diagnostic.message}${diagnostic.path ? ` (path: ${diagnostic.path})` : ''}${diagnostic.actual ? ` (actual: ${diagnostic.actual})` : ''}`,
    );
    logger.stderr(`::${level} title=${title},file=${file}::${message}\n`);
  }
}

async function handleInit(
  output: string,
  force: boolean,
  presetName: string | undefined,
  prompt: string | undefined,
  cwd: string,
  logger: Logger,
): Promise<number> {
  const target = resolve(cwd, output);
  if (!force && (await pathExists(target))) {
    logger.stderr(chalk.red(`Error: ${output} already exists. Use --force to overwrite.\n`));
    return 2;
  }

  let tokenSet = DEFAULT_TOKEN_SET;
  if (prompt && !presetName) {
    const result = resolvePromptToTokenSet(prompt);
    tokenSet = result.tokenSet;
    logger.stderr(chalk.cyan(`Inferred: ${result.reasoning}\n`));
    if (result.recommendedReferences.length > 0) {
      logger.stderr(
        chalk.cyan(
          `Reference fit: ${result.recommendedReferences
            .slice(0, 3)
            .map((reference) => `${reference.referenceId} (${reference.score}%)`)
            .join(', ')}\n`,
        ),
      );
    }
  } else if (presetName) {
    const preset = getPreset(presetName);
    if (!preset) {
      logger.stderr(
        chalk.red(
          `Error: Unknown preset "${presetName}". Available presets: ${PRESET_NAMES.join(', ')}\n`,
        ),
      );
      return 2;
    }
    tokenSet = preset;
  }

  await writeJsonFile(target, tokenSet);
  logger.stdout(`${chalk.green('Created')} ${output}\n`);
  return 0;
}

async function handleCheck(
  input: string,
  installHook: boolean,
  cwd: string,
  logger: Logger,
): Promise<number> {
  if (installHook) {
    const huskyDir = resolve(cwd, '.husky');
    const gitHooksDir = resolve(cwd, '.git/hooks');

    const huskyExists = await pathExists(huskyDir);
    const gitHooksExists = await pathExists(gitHooksDir);

    if (huskyExists) {
      const hookPath = resolve(huskyDir, 'pre-commit');
      await writeFile(hookPath, `npx fetchtype check\n`, 'utf8');
      const { chmod } = await import('node:fs/promises');
      await chmod(hookPath, 0o755);
      logger.stdout(`${chalk.green('Installed')} pre-commit hook: ${hookPath}\n`);
      return 0;
    }

    if (gitHooksExists) {
      const hookPath = resolve(gitHooksDir, 'pre-commit');
      const hookContent =
        '#!/usr/bin/env sh\n# fetchtype pre-commit hook\n# Validates typography tokens before commit\n\nnpx fetchtype check\n';
      await writeFile(hookPath, hookContent, 'utf8');
      const { chmod } = await import('node:fs/promises');
      await chmod(hookPath, 0o755);
      logger.stdout(`${chalk.green('Installed')} pre-commit hook: ${hookPath}\n`);
      return 0;
    }

    logger.stderr(chalk.red('Error: No .husky directory or .git/hooks directory found.\n'));
    return 2;
  }

  const config = await loadConfig(cwd);

  const tokenFile = resolve(cwd, input);
  if (!(await pathExists(tokenFile))) {
    logger.stderr(chalk.red(`Error: Token file not found: ${input}\n`));
    return 2;
  }

  const raw = await loadJsonFile(tokenFile);

  const validationConfig = config
    ? {
        rules: config.rules ?? {},
        fonts: config.fonts,
        performance: config.performance,
        requiredSubsets: config.requiredSubsets,
      }
    : undefined;

  const report = validateDesignTokenSet(raw, {}, validationConfig);

  // Run font validation and append diagnostics
  try {
    const tokenSet = parseDesignTokenSet(raw);
    const fontDiagnostics = validateFonts(tokenSet, validationConfig);
    report.diagnostics.push(...fontDiagnostics);
    for (const diagnostic of fontDiagnostics) {
      report.counts[diagnostic.severity] += 1;
    }
  } catch {
    // If parsing fails, font validation is skipped (schema errors already reported)
  }

  const totalErrors = report.counts.error;

  if (report.pass) {
    const passLabel =
      report.diagnostics.length === 0
        ? 'all rules passed'
        : `${report.diagnostics.filter((d: { severity: string }) => d.severity === 'info').length} rules passed`;
    logger.stdout(chalk.green(`✓ fetchtype: ${passLabel}\n`));
    return 0;
  } else {
    logger.stdout(
      chalk.red(`✗ fetchtype: ${totalErrors} error${totalErrors !== 1 ? 's' : ''} found\n`),
    );
    return 1;
  }
}

type ValidateOutputFormat = 'text' | 'json' | 'sarif';

async function handleValidate(
  input: string,
  referenceSystems: string[],
  outputFormat: ValidateOutputFormat,
  github: boolean,
  cwd: string,
  logger: Logger,
): Promise<number> {
  const config = await loadConfig(cwd);
  const target = resolve(cwd, input);
  const raw = await loadJsonFile(target);

  // Build ValidationConfig from loaded config
  const validationConfig = config
    ? {
        rules: config.rules ?? {},
        fonts: config.fonts,
        performance: config.performance,
        requiredSubsets: config.requiredSubsets,
      }
    : undefined;

  const report = validateDesignTokenSet(raw, { referenceSystems }, validationConfig);

  // Run font validation and append diagnostics (non-blocking — warnings/info only)
  try {
    const tokenSet = parseDesignTokenSet(raw);
    const fontDiagnostics = validateFonts(tokenSet, validationConfig);
    report.diagnostics.push(...fontDiagnostics);
    for (const diagnostic of fontDiagnostics) {
      report.counts[diagnostic.severity] += 1;
    }
  } catch {
    // If parsing fails, font validation is skipped (schema errors already reported)
  }

  if (outputFormat === 'sarif') {
    const sarifLog = formatSarifReport(report, input);
    logger.stdout(`${JSON.stringify(sarifLog, null, 2)}\n`);
  } else if (outputFormat === 'json') {
    logger.stdout(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    logger.stdout(formatReport(report));
  }

  if (github) {
    await emitGithubReport(report, input, logger);
  }

  return report.pass ? 0 : 1;
}

async function handleBuild(
  input: string,
  outDir: string | undefined,
  prefix: string,
  format: BuildFormat,
  referenceSystems: string[],
  asJson: boolean,
  withReport: boolean,
  cwd: string,
  logger: Logger,
): Promise<number> {
  const config = await loadConfig(cwd);
  const target = resolve(cwd, input);

  // Build ValidationConfig from loaded config
  const validationConfig = config
    ? {
        rules: config.rules ?? {},
        fonts: config.fonts,
        performance: config.performance,
        requiredSubsets: config.requiredSubsets,
      }
    : undefined;

  const artifacts = buildTokenArtifacts(await loadJsonFile(target), { prefix, referenceSystems }, validationConfig);

  if (!artifacts.report.pass) {
    if (asJson) {
      logger.stdout(`${JSON.stringify(artifacts.report, null, 2)}\n`);
    } else {
      logger.stdout(formatReport(artifacts.report));
    }

    return 1;
  }

  const outputDirectory = resolve(cwd, outDir ?? config?.outDir ?? 'dist/tokens');
  await mkdir(outputDirectory, { recursive: true });

  const cssPath = resolve(outputDirectory, 'tokens.css');
  const jsonPath = resolve(outputDirectory, 'tokens.json');
  const builtPaths: string[] = [];

  if (format === 'all' || format === 'css') {
    await writeFile(cssPath, `${artifacts.css}\n`, 'utf8');
    builtPaths.push(cssPath);
  }

  if (format === 'all' || format === 'json') {
    await writeFile(jsonPath, `${artifacts.json}\n`, 'utf8');
    builtPaths.push(jsonPath);
  }

  if (format === 'tailwind') {
    const tailwindPath = resolve(outputDirectory, 'tailwind.config.ts');
    const tailwindConfig = generateTailwindConfig(artifacts.tokenSet, { prefix });
    await writeFile(tailwindPath, `${tailwindConfig}\n`, 'utf8');
    builtPaths.push(tailwindPath);
  }

  if (format === 'shadcn') {
    const shadcnPath = resolve(outputDirectory, 'shadcn.css');
    const shadcnCss = generateShadcnCss(artifacts.tokenSet);
    await writeFile(shadcnPath, `${shadcnCss}\n`, 'utf8');
    builtPaths.push(shadcnPath);
  }

  if (format === 'w3c') {
    const w3cPath = resolve(outputDirectory, 'tokens.w3c.json');
    const w3cTokens = exportW3cTokens(artifacts.tokenSet);
    await writeFile(w3cPath, `${JSON.stringify(w3cTokens, null, 2)}\n`, 'utf8');
    builtPaths.push(w3cPath);
  }

  if (withReport) {
    const reportPath = resolve(outputDirectory, 'report.html');
    const htmlReport = generateHtmlReport(artifacts.tokenSet, artifacts.report, artifacts.css);
    await writeFile(reportPath, htmlReport, 'utf8');
    builtPaths.push(reportPath);
  }

  if (asJson) {
    logger.stdout(
      `${JSON.stringify(
        {
          builtPaths,
          report: artifacts.report,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    for (const builtPath of builtPaths) {
      logger.stdout(`${chalk.green('Built')} ${builtPath}\n`);
    }
  }

  return 0;
}

async function handleSystems(
  query: string | undefined,
  useCase: string | undefined,
  style: string | undefined,
  kind: TypographySystemQueryKind,
  patternsOnly: boolean,
  asJson: boolean,
  logger: Logger,
): Promise<number> {
  const result = queryTypographySystems({
    query,
    useCase,
    style,
    kind,
    includePatterns: true,
  });

  if (asJson) {
    logger.stdout(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    logger.stdout(formatTypographySystemsResult(result, patternsOnly));
  }

  return 0;
}

function formatDriftReport(report: DriftReport): string {
  const lines = ['Typography Drift Report', '═══════════════════════'];

  if (report.breaking.length === 0 && report.nonBreaking.length === 0 && report.improvements.length === 0) {
    lines.push('', 'No changes detected.');
    return `${lines.join('\n')}\n`;
  }

  if (report.breaking.length > 0) {
    lines.push('', `\u26d4 Breaking (${report.breaking.length})`);
    for (const change of report.breaking) {
      lines.push(`- ${change.path}: ${change.description}`);
    }
  }

  if (report.nonBreaking.length > 0) {
    lines.push('', `\u26a0 Non-breaking (${report.nonBreaking.length})`);
    for (const change of report.nonBreaking) {
      lines.push(`- ${change.path}: ${change.description}`);
    }
  }

  if (report.improvements.length > 0) {
    lines.push('', `\u2705 Improvements (${report.improvements.length})`);
    for (const change of report.improvements) {
      lines.push(`- ${change.path}: ${change.description}`);
    }
  }

  lines.push('', `Summary: ${report.summary}`);
  return `${lines.join('\n')}\n`;
}

async function handleDrift(
  baselinePath: string,
  currentPath: string,
  asJson: boolean,
  ci: boolean,
  cwd: string,
  logger: Logger,
): Promise<number> {
  const baselineTarget = resolve(cwd, baselinePath);
  const currentTarget = resolve(cwd, currentPath);

  const baselineRaw = await loadJsonFile(baselineTarget);
  const currentRaw = await loadJsonFile(currentTarget);

  let report: DriftReport;
  try {
    report = detectDrift(baselineRaw, currentRaw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.stderr(chalk.red(`Error: ${message}\n`));
    return 2;
  }

  if (asJson) {
    logger.stdout(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const formatted = formatDriftReport(report);
    const lines = formatted.split('\n');
    for (const line of lines) {
      if (line.startsWith('\u26d4') || (line.startsWith('-') && report.breaking.some((c) => line.includes(c.path)))) {
        logger.stdout(`${chalk.red(line)}\n`);
      } else if (line.startsWith('\u26a0')) {
        logger.stdout(`${chalk.yellow(line)}\n`);
      } else if (line.startsWith('\u2705')) {
        logger.stdout(`${chalk.green(line)}\n`);
      } else {
        logger.stdout(`${line}\n`);
      }
    }
  }

  if (ci && report.breaking.length > 0) {
    return 1;
  }

  return 0;
}

async function handleGenerate(
  context: string,
  brandColor: string | undefined,
  preset: string | undefined,
  asJson: boolean,
  output: string,
  cwd: string,
  logger: Logger,
): Promise<number> {
  const result = generateTokenSet({ context, brandColor, preset });

  if (asJson) {
    logger.stdout(`${JSON.stringify(result.tokenSet, null, 2)}\n`);
    return 0;
  }

  const outputPath = resolve(cwd, output);
  await writeJsonFile(outputPath, result.tokenSet);

  logger.stdout(`${chalk.green('Generated')} ${outputPath}\n`);
  for (const line of result.reasoning) {
    logger.stdout(`  ${line}\n`);
  }
  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      logger.stderr(`${chalk.yellow('Warning:')} ${w}\n`);
    }
  }

  return 0;
}

export function createProgram(logger: Logger = defaultLogger, cwd = process.cwd()): Command {
  const program = new Command();

  program
    .name('fetchtype')
    .description('Validate and export typography tokens.')
    .showHelpAfterError();

  program
    .command('check')
    .description('Fast-path validation (pass/fail only). Suitable for pre-commit hooks.')
    .argument('[input]', 'Path to the token JSON file', 'tokens.json')
    .option('--install-hook', 'Install fetchtype check as a git pre-commit hook')
    .action(async (input: string, options: { installHook?: boolean }) => {
      program.setOptionValueWithSource(
        '_result',
        await handleCheck(input, Boolean(options.installHook), cwd, logger),
        'cli',
      );
    });

  program
    .command('init')
    .description('Write a starter token file.')
    .argument('[output]', 'Output file path', 'fetchtype.tokens.json')
    .option('-f, --force', 'Overwrite existing file')
    .option('-p, --preset <name>', 'Use a named preset (base, editorial, dashboard, ecommerce, docs, fluent, material, carbon, spectrum, radix)')
    .option('--prompt <description>', 'Natural language description to infer token configuration')
    .action(async (output: string, options: { force?: boolean; preset?: string; prompt?: string }) => {
      program.setOptionValueWithSource(
        '_result',
        await handleInit(output, Boolean(options.force), options.preset, options.prompt, cwd, logger),
        'cli',
      );
    });

  program
    .command('validate')
    .description('Validate a token file.')
    .requiredOption('-i, --input <path>', 'Path to the token JSON file')
    .option(
      '--reference <id>',
      'Evaluate alignment against a typography system or archetype id (repeatable or comma-separated)',
      (value: string, previous: string[] = []) => [
        ...previous,
        ...value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ],
      [],
    )
    .option('--github', 'Emit GitHub step summaries and workflow annotations')
    .option('--json', 'Print machine-readable JSON output (equivalent to --output-format json)')
    .option('--ci', 'CI mode: emit SARIF output and set exit code (equivalent to --output-format sarif)')
    .addOption(
      new Option('--output-format <format>', 'Output format: text, json, sarif')
        .choices(['text', 'json', 'sarif'])
        .default('text'),
    )
    .action(async (options: { input: string; reference: string[]; github?: boolean; json?: boolean; ci?: boolean; outputFormat: ValidateOutputFormat }) => {
      // --ci implies sarif; --json implies json; --output-format takes precedence when explicit
      let outputFormat: ValidateOutputFormat = options.outputFormat;
      if (options.ci && options.outputFormat === 'text') {
        outputFormat = 'sarif';
      } else if (options.json && options.outputFormat === 'text') {
        outputFormat = 'json';
      }

      program.setOptionValueWithSource(
        '_result',
        await handleValidate(
          options.input,
          options.reference,
          outputFormat,
          Boolean(options.github),
          cwd,
          logger,
        ),
        'cli',
      );
    });

  program
    .command('build')
    .description('Generate CSS and JSON bundles from tokens.')
    .requiredOption('-i, --input <path>', 'Path to the token JSON file')
    .option('-o, --out-dir <path>', 'Output directory')
    .option('--prefix <value>', 'CSS variable prefix', 'ft')
    .option(
      '--reference <id>',
      'Include reference evaluation in build/report output (repeatable or comma-separated)',
      (value: string, previous: string[] = []) => [
        ...previous,
        ...value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ],
      [],
    )
    .addOption(
      new Option('--format <type>', 'Artifact format (all, css, json, tailwind, shadcn, w3c)')
        .choices(['all', 'css', 'json', 'tailwind', 'shadcn', 'w3c'])
        .default('all'),
    )
    .option('--json', 'Print machine-readable JSON output')
    .option('--report', 'Generate an HTML report alongside build artifacts')
    .action(
      async (options: {
        input: string;
        outDir?: string;
        prefix: string;
        format: BuildFormat;
        reference: string[];
        json?: boolean;
        report?: boolean;
      }) => {
        program.setOptionValueWithSource(
          '_result',
          await handleBuild(
            options.input,
            options.outDir,
            options.prefix,
            options.format,
            options.reference,
            Boolean(options.json),
            Boolean(options.report),
            cwd,
            logger,
          ),
          'cli',
        );
      },
    );

  program
    .command('systems')
    .description('Query curated typography systems, keywords, and extracted patterns.')
    .option('--query <text>', 'Match by system name, keyword, or characteristic')
    .option('--use-case <name>', 'Filter by use case')
    .option('--style <name>', 'Filter by style')
    .addOption(
      new Option(
        '--kind <type>',
        'Dataset subset (all, official-design-system, foundational-archetype)',
      )
        .choices(['all', 'official-design-system', 'foundational-archetype'])
        .default('all'),
    )
    .option('--patterns', 'Show extracted patterns only')
    .option('--json', 'Print machine-readable JSON output')
    .action(
      async (options: {
        query?: string;
        useCase?: string;
        style?: string;
        kind: TypographySystemQueryKind;
        patterns?: boolean;
        json?: boolean;
      }) => {
        program.setOptionValueWithSource(
          '_result',
          await handleSystems(
            options.query,
            options.useCase,
            options.style,
            options.kind,
            Boolean(options.patterns),
            Boolean(options.json),
            logger,
          ),
          'cli',
        );
      },
    );

  program
    .command('import')
    .description('Import a W3C Design Tokens file into fetchtype format.')
    .requiredOption('-i, --input <path>', 'Path to the W3C token JSON file')
    .option('-o, --output <path>', 'Output file path', 'fetchtype.tokens.json')
    .action(async (options: { input: string; output: string }) => {
      const inputPath = resolve(cwd, options.input);
      const outputPath = resolve(cwd, options.output);
      try {
        const raw = await loadJsonFile(inputPath);
        const tokenSet = importW3cTokens(raw);
        const report = validateDesignTokenSet(tokenSet);
        await writeJsonFile(outputPath, tokenSet);
        logger.stdout(`${chalk.green('Imported')} ${options.output}\n`);
        if (!report.pass) {
          logger.stderr(formatReport(report));
        }
        program.setOptionValueWithSource('_result', report.pass ? 0 : 1, 'cli');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.stderr(chalk.red(`Error: ${message}\n`));
        program.setOptionValueWithSource('_result', 2, 'cli');
      }
    });

  program
    .command('suggest')
    .description('Suggest fonts for a given usage context.')
    .requiredOption('-c, --context <type>', 'Usage context (display, interface, reading, mono)')
    .option('-l, --limit <number>', 'Maximum number of suggestions', '5')
    .option('--reference <id>', 'Bias suggestions toward a typography reference system or archetype')
    .option('--variable-only', 'Only suggest variable fonts')
    .option('--json', 'Print machine-readable JSON output')
    .action(
      async (options: {
        context: string;
        limit: string;
        reference?: string;
        variableOnly?: boolean;
        json?: boolean;
      }) => {
        const validContexts = ['display', 'interface', 'reading', 'mono'];
        if (!validContexts.includes(options.context)) {
          logger.stderr(
            chalk.red(
              `Error: Invalid context "${options.context}". Valid contexts: ${validContexts.join(', ')}\n`,
            ),
          );
          program.setOptionValueWithSource('_result', 2, 'cli');
          return;
        }

        const suggestions = suggestFonts(options.context as SuggestionContext, {
          limit: Number(options.limit),
          variableOnly: Boolean(options.variableOnly),
        });

        if (Boolean(options.json)) {
          logger.stdout(`${JSON.stringify(suggestions, null, 2)}\n`);
        } else {
          if (suggestions.length === 0) {
            logger.stdout('No fonts found matching the criteria.\n');
          } else {
            const header = `${'Family'.padEnd(24)} ${'Category'.padEnd(14)} ${'Variable'.padEnd(10)} ${'Size'.padEnd(8)} Reason`;
            logger.stdout(`${header}\n${'─'.repeat(header.length)}\n`);
            for (const suggestion of suggestions) {
              logger.stdout(
                `${suggestion.family.padEnd(24)} ${suggestion.category.padEnd(14)} ${(suggestion.variable ? 'yes' : 'no').padEnd(10)} ${`${suggestion.sizeKb}KB`.padEnd(8)} ${suggestion.reason}\n`,
              );
            }
          }
        }

        program.setOptionValueWithSource('_result', 0, 'cli');
      },
    );

  // ── Registry commands ──

  program
    .command('resolve <font>')
    .description('Resolve a font from the registry. Returns full metadata, install paths, and optional fallback CSS.')
    .option('--json', 'Print machine-readable JSON output')
    .option('--css', 'Print ready-to-use @font-face CSS block')
    .option('--fallback', 'Include platform-aware fallback CSS with metric overrides')
    .option('--compact', 'Use compact single @font-face for fallback (less precise, smaller CSS)')
    .action(
      async (font: string, options: { json?: boolean; css?: boolean; fallback?: boolean; compact?: boolean }) => {
        const entry = resolveFont(font);
        if (!entry) {
          logger.stderr(chalk.red(`Error: Font "${font}" not found in registry.\n`));
          program.setOptionValueWithSource('_result', 1, 'cli');
          return;
        }

        if (options.json) {
          logger.stdout(`${JSON.stringify(entry, null, 2)}\n`);
        } else if (options.css || options.fallback) {
          if (options.fallback) {
            const css = generateFallbackCSS(entry, { compact: options.compact });
            logger.stdout(`${css}\n`);
          } else {
            // Basic @font-face from install info
            if (entry.install.googleCdn) {
              logger.stdout(`/* Google Fonts */\n@import url('${entry.install.googleCdn}');\n\n`);
            }
            if (entry.install.fontsource) {
              logger.stdout(`/* Fontsource */\nimport '${entry.install.fontsource}';\n`);
            }
          }
        } else {
          // Human-readable summary
          logger.stdout(`${chalk.bold(entry.family)} (${entry.id})\n`);
          logger.stdout(`  Source:     ${entry.source}\n`);
          logger.stdout(`  Category:  ${entry.category}\n`);
          logger.stdout(`  Variable:  ${entry.variable ? 'yes' : 'no'}\n`);
          logger.stdout(`  Weights:   ${entry.weights.join(', ')}\n`);
          logger.stdout(`  Styles:    ${entry.styles.join(', ')}\n`);
          logger.stdout(`  Subsets:   ${entry.subsets.join(', ')}\n`);
          logger.stdout(`  Contexts:  ${entry.contexts.join(', ')}\n`);
          logger.stdout(`  License:   ${entry.license.type}\n`);
          logger.stdout(`  Payload:   ~${Math.round(entry.performance.estimatedPayload / 1024)}KB (${entry.performance.loadingImpact})\n`);
          if (entry.install.fontsource) {
            logger.stdout(`  Install:   ${entry.install.fontsource}\n`);
          }
          if (entry.install.googleCdn) {
            logger.stdout(`  CDN:       ${entry.install.googleCdn}\n`);
          }
          if (entry.install.system?.platforms) {
            logger.stdout(`  Platforms: ${entry.install.system.platforms.join(', ')}\n`);
          }
        }

        program.setOptionValueWithSource('_result', 0, 'cli');
      },
    );

  program
    .command('pair <font>')
    .description('Get font pairing recommendations from the registry.')
    .option('-r, --role <role>', 'Filter by role: heading, body, accent, mono')
    .option('-l, --limit <number>', 'Maximum number of pairings', '5')
    .option('--json', 'Print machine-readable JSON output')
    .action(
      async (font: string, options: { role?: string; limit: string; json?: boolean }) => {
        const entry = resolveFont(font);
        if (!entry) {
          logger.stderr(chalk.red(`Error: Font "${font}" not found in registry.\n`));
          program.setOptionValueWithSource('_result', 1, 'cli');
          return;
        }

        const validRoles = ['heading', 'body', 'accent', 'mono'];
        if (options.role && !validRoles.includes(options.role)) {
          logger.stderr(chalk.red(`Error: Invalid role "${options.role}". Valid roles: ${validRoles.join(', ')}\n`));
          program.setOptionValueWithSource('_result', 1, 'cli');
          return;
        }

        const pairings = recommendPairings(font, {
          role: options.role as 'heading' | 'body' | 'accent' | 'mono' | undefined,
          limit: Number(options.limit),
        });

        if (options.json) {
          logger.stdout(`${JSON.stringify(pairings, null, 2)}\n`);
        } else {
          if (pairings.length === 0) {
            logger.stdout('No pairing recommendations found.\n');
          } else {
            logger.stdout(`Pairing recommendations for ${chalk.bold(entry.family)}:\n\n`);
            const header = `${'Font'.padEnd(24)} ${'Role'.padEnd(10)} ${'Score'.padEnd(8)} Rationale`;
            logger.stdout(`${header}\n${'─'.repeat(80)}\n`);
            for (const p of pairings) {
              const pairFont = resolveFont(p.fontId);
              const name = pairFont?.family ?? p.fontId;
              logger.stdout(
                `${name.padEnd(24)} ${p.role.padEnd(10)} ${p.confidence.toFixed(2).padEnd(8)} ${p.rationale}\n`,
              );
            }
          }
        }

        program.setOptionValueWithSource('_result', 0, 'cli');
      },
    );

  program
    .command('search [query...]')
    .description('Search the font registry with free-text and filters.')
    .option('-c, --context <type>', 'Filter by context (display, interface, reading, mono, editorial, data)')
    .option('--variable', 'Only variable fonts')
    .option('--category <cat>', 'Filter by category (sans-serif, serif, monospace, display, handwriting)')
    .option('--subset <name>', 'Filter by subset support (e.g. cyrillic)')
    .option('--max-payload <bytes>', 'Maximum estimated payload in bytes')
    .option('-l, --limit <number>', 'Maximum number of results', '20')
    .option('--json', 'Print machine-readable JSON output')
    .action(
      async (
        queryParts: string[],
        options: {
          context?: string;
          variable?: boolean;
          category?: string;
          subset?: string;
          maxPayload?: string;
          limit: string;
          json?: boolean;
        },
      ) => {
        const results = searchRegistry({
          query: queryParts.length > 0 ? queryParts.join(' ') : undefined,
          context: options.context as any,
          variable: options.variable,
          category: options.category as any,
          subset: options.subset,
          maxPayload: options.maxPayload ? Number(options.maxPayload) : undefined,
          limit: Number(options.limit),
        });

        if (options.json) {
          logger.stdout(`${JSON.stringify(results, null, 2)}\n`);
        } else {
          const stats = registryStats();
          logger.stdout(`Registry: ${stats.count} fonts (${stats.variableCount} variable)\n\n`);

          if (results.length === 0) {
            logger.stdout('No fonts found matching the criteria.\n');
          } else {
            const header = `${'Family'.padEnd(28)} ${'Category'.padEnd(14)} ${'Variable'.padEnd(10)} ${'Payload'.padEnd(10)} Contexts`;
            logger.stdout(`${header}\n${'─'.repeat(90)}\n`);
            for (const f of results) {
              const payload = f.source === 'system' ? 'system' : `~${Math.round(f.performance.estimatedPayload / 1024)}KB`;
              logger.stdout(
                `${f.family.padEnd(28)} ${f.category.padEnd(14)} ${(f.variable ? 'yes' : 'no').padEnd(10)} ${payload.padEnd(10)} ${f.contexts.join(', ')}\n`,
              );
            }
            logger.stdout(`\n${results.length} result${results.length !== 1 ? 's' : ''}\n`);
          }
        }

        program.setOptionValueWithSource('_result', 0, 'cli');
      },
    );

  program
    .command('prepare <font>')
    .description('Download, optimize, and deploy a font for production use.')
    .option('--weights <weights>', 'Comma-separated weights (e.g. 400,500,700)')
    .option('--subsets <subsets>', 'Comma-separated subsets (e.g. latin,latin-ext)', 'latin')
    .option('-o, --output <dir>', 'Output directory', './dist/fonts')
    .option('--display <value>', 'font-display value', 'swap')
    .option('--no-fallbacks', 'Skip fallback CSS generation')
    .option('--budget <bytes>', 'Performance budget in bytes', '150000')
    .option('--tokens <path>', 'Path to fetchtype.tokens.json to update')
    .action(
      async (
        font: string,
        options: {
          weights?: string;
          subsets: string;
          output: string;
          display: string;
          fallbacks: boolean;
          budget: string;
          tokens?: string;
        },
      ) => {
        logger.stdout(`fetchtype prepare: ${chalk.bold(font)}\n\n`);

        const weights = options.weights
          ? options.weights.split(',').map((w) => Number(w.trim())).filter(Boolean)
          : undefined;
        const subsets = options.subsets.split(',').map((s) => s.trim()).filter(Boolean);
        const performanceBudget = Number(options.budget);
        const fontDisplay = options.display as 'swap' | 'block' | 'fallback' | 'optional' | 'auto';

        let manifest: PrepareManifest;
        try {
          logger.stdout(`  Downloading ${chalk.cyan(font)} from Google Fonts...\n`);
          manifest = await prepareFont({
            fontId: font,
            weights,
            subsets,
            outputDir: options.output,
            fontDisplay,
            generateFallbacks: options.fallbacks,
            performanceBudget,
            tokenFile: options.tokens,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.stderr(chalk.red(`  Error: ${message}\n`));
          program.setOptionValueWithSource('_result', 1, 'cli');
          return;
        }

        // Downloaded files
        for (const file of manifest.files) {
          const kb = (file.size / 1024).toFixed(1);
          logger.stdout(`    ${chalk.green('✓')} ${file.path.split('/').pop()} (${kb} KB)\n`);
        }

        // Generated artifacts
        logger.stdout(`\n  Generated:\n`);
        for (const file of manifest.files) {
          logger.stdout(`    ${file.path}\n`);
        }
        logger.stdout(`    ${options.output}/font-face.css\n`);
        if (options.fallbacks) {
          logger.stdout(`    ${options.output}/fallback.css\n`);
        }
        logger.stdout(`    ${options.output}/preload.html\n`);
        logger.stdout(`    ${options.output}/manifest.json\n`);

        // Performance
        const totalKb = (manifest.performance.totalSize / 1024).toFixed(1);
        const budgetKb = (manifest.performance.budgetLimit / 1024).toFixed(1);
        logger.stdout(`\n  Performance:\n`);
        logger.stdout(
          `    Total: ${totalKb} KB / ${budgetKb} KB budget (${manifest.performance.budgetUsed}%)\n`,
        );
        if (manifest.performance.budgetExceeded) {
          logger.stdout(
            `    ${chalk.yellow('⚠')} Exceeds performance budget\n`,
          );
        } else {
          logger.stdout(`    ${chalk.green('✓')} Within performance budget\n`);
        }

        // Token file update
        if (options.tokens && manifest.tokenPatch) {
          logger.stdout(`\n  Updated: ${options.tokens}\n`);
        }

        logger.stdout('\n');
        program.setOptionValueWithSource('_result', 0, 'cli');
      },
    );

  program
    .command('audit')
    .description('Audit a project or URL for typography issues.')
    .option('--dir <path>', 'Directory to scan for typography issues')
    .option('--url <url>', 'URL to analyze for typography issues')
    .addOption(
      new Option('--format <format>', 'Output format: terminal, json')
        .choices(['terminal', 'json'])
        .default('terminal'),
    )
    .option('--fix', 'Generate corrected fetchtype.tokens.json')
    .action(
      async (options: {
        dir?: string;
        url?: string;
        format: 'terminal' | 'json';
        fix?: boolean;
      }) => {
        if (!options.dir && !options.url) {
          logger.stderr(chalk.red('Error: Provide either --dir <path> or --url <url>.\n'));
          program.setOptionValueWithSource('_result', 2, 'cli');
          return;
        }
        if (options.dir && options.url) {
          logger.stderr(chalk.red('Error: Use --dir or --url, not both.\n'));
          program.setOptionValueWithSource('_result', 2, 'cli');
          return;
        }

        let result: AuditResult;
        try {
          if (options.dir) {
            const target = resolve(cwd, options.dir);
            result = await auditDirectory(target);
          } else {
            result = await auditUrl(options.url!);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.stderr(chalk.red(`Error: ${message}\n`));
          program.setOptionValueWithSource('_result', 2, 'cli');
          return;
        }

        if (options.format === 'json') {
          logger.stdout(`${JSON.stringify(result, null, 2)}\n`);
        } else {
          const reportText = formatAuditReport(result);
          for (const line of reportText.split('\n')) {
            if (line.startsWith('    x ')) {
              logger.stdout(`${chalk.red(line)}\n`);
            } else if (line.startsWith('    ! ')) {
              logger.stdout(`${chalk.yellow(line)}\n`);
            } else if (line.startsWith('    i ')) {
              logger.stdout(`${chalk.cyan(line)}\n`);
            } else if (line.startsWith('    -> ')) {
              logger.stdout(`${chalk.green(line)}\n`);
            } else if (line.startsWith('      Fix:')) {
              logger.stdout(`${chalk.dim(line)}\n`);
            } else {
              logger.stdout(`${line}\n`);
            }
          }
        }

        if (options.fix && result.fontsDetected.length > 0) {
          const tokens = generateCorrectedTokens(result);
          const outputPath = resolve(cwd, 'fetchtype.tokens.json');
          await writeFile(outputPath, `${JSON.stringify(tokens, null, 2)}\n`, 'utf8');
          logger.stdout(chalk.green('\n  Generated: fetchtype.tokens.json (corrected, validated, ready to build)\n'));
        }

        const hasErrors = result.issues.some((i) => i.severity === 'error');
        program.setOptionValueWithSource('_result', hasErrors ? 1 : 0, 'cli');
      },
    );

  program
    .command('preview')
    .description('Start a live preview server for token visualization.')
    .requiredOption('-i, --input <path>', 'Path to the token JSON file')
    .option('--port <number>', 'Port to listen on', '3000')
    .action(async (options: { input: string; port: string }) => {
      const target = resolve(cwd, options.input);
      try {
        await startPreviewServer(target, Number(options.port));
        program.setOptionValueWithSource('_result', 0, 'cli');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.stderr(chalk.red(`Error: ${message}\n`));
        program.setOptionValueWithSource('_result', 2, 'cli');
      }
    });

  program
    .command('mcp')
    .description('Start MCP server for AI agent integration (stdio transport).')
    .action(async () => {
      await startMcpServer();
      program.setOptionValueWithSource('_result', 0, 'cli');
    });

  program
    .command('generate')
    .description('Generate a complete token file from a context keyword.')
    .requiredOption('--context <context>', 'Target context: saas-dashboard, editorial, ecommerce, docs, marketing, dashboard, etc.')
    .option('--brand <hex>', 'Primary brand color hex (e.g. #2563eb)')
    .option('-p, --preset <name>', 'Explicit preset name to use as base')
    .option('--json', 'Output token set to stdout as JSON instead of writing a file')
    .option('-o, --output <path>', 'Output file path', 'tokens.json')
    .action(
      async (options: { context: string; brand?: string; preset?: string; json?: boolean; output: string }) => {
        program.setOptionValueWithSource(
          '_result',
          await handleGenerate(
            options.context,
            options.brand,
            options.preset,
            Boolean(options.json),
            options.output,
            cwd,
            logger,
          ),
          'cli',
        );
      },
    );

  program
    .command('drift')
    .description('Compare two token snapshots and report typography drift.')
    .requiredOption('--baseline <path>', 'Path to the baseline token JSON file')
    .requiredOption('--current <path>', 'Path to the current token JSON file')
    .option('--json', 'Print machine-readable JSON output')
    .option('--ci', 'Exit with code 1 if any breaking changes are detected')
    .action(
      async (options: { baseline: string; current: string; json?: boolean; ci?: boolean }) => {
        program.setOptionValueWithSource(
          '_result',
          await handleDrift(
            options.baseline,
            options.current,
            Boolean(options.json),
            Boolean(options.ci),
            cwd,
            logger,
          ),
          'cli',
        );
      },
    );

  program.exitOverride();
  return program;
}

export async function runCli(
  argv: string[] = process.argv.slice(2),
  logger: Logger = defaultLogger,
  cwd = process.cwd(),
): Promise<number> {
  const program = createProgram(logger, cwd);

  try {
    await program.parseAsync(argv, { from: 'user' });
    return Number(program.getOptionValue('_result') ?? 0);
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.stderr(chalk.red(`Error: ${message}\n`));
    return 2;
  }
}
