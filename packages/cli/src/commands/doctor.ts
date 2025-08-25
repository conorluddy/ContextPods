/**
 * Doctor command - System health check and troubleshooting
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

import type { CommandContext } from '../types/cli-types.js';
import { output } from '../utils/output-formatter.js';

export interface DoctorOptions {
  verbose?: boolean;
  fix?: boolean;
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
  fix?: () => Promise<void>;
}

/**
 * Run system health checks and diagnostics
 */
export async function doctorCommand(
  options: DoctorOptions,
  context: CommandContext,
): Promise<void> {
  output.info('🏥 Context-Pods Health Check');
  output.info('================================');

  const checks: HealthCheck[] = [];

  // Environment checks
  await checkNodeVersion(checks);
  await checkNpmVersion(checks);
  await checkWorkspaceStructure(checks, context);
  await checkPackageBuild(checks, context);
  await checkTemplatesAvailability(checks, context);
  await checkTurboConfig(checks, context);
  await checkGitRepository(checks, context);
  await checkDependencies(checks, context);
  await checkMCPServerHealth(checks, context);

  // Display results
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const check of checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    const color = check.status === 'pass' ? 'success' : check.status === 'warn' ? 'warn' : 'error';

    output[color](`${icon} ${check.name}: ${check.message}`);

    if (check.details && (options.verbose || check.status !== 'pass')) {
      output.info(`   ${check.details}`);
    }

    if (check.status === 'pass') passCount++;
    else if (check.status === 'warn') warnCount++;
    else failCount++;
  }

  // Summary
  output.info('\n📊 Health Check Summary');
  output.info('=======================');
  output.success(`✅ Passed: ${passCount}`);
  if (warnCount > 0) output.warn(`⚠️  Warnings: ${warnCount}`);
  if (failCount > 0) output.error(`❌ Failed: ${failCount}`);

  // Overall status
  if (failCount > 0) {
    output.error('\n🚨 System has critical issues that need attention');
    if (options.fix) {
      output.info('\n🔧 Attempting to fix issues...');
      await attemptFixes(checks);
    } else {
      output.info('Run with --fix to attempt automatic repairs');
    }
  } else if (warnCount > 0) {
    output.warn('\n⚠️  System is functional but has some warnings');
  } else {
    output.success('\n🎉 All checks passed! System is healthy');
  }
}

async function checkNodeVersion(checks: HealthCheck[]): Promise<void> {
  try {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0] || '0', 10);

    if (majorVersion >= 18) {
      checks.push({
        name: 'Node.js Version',
        status: 'pass',
        message: `${version} (>= 18.0.0)`,
      });
    } else {
      checks.push({
        name: 'Node.js Version',
        status: 'fail',
        message: `${version} is too old`,
        details: 'Context-Pods requires Node.js >= 18.0.0',
      });
    }
  } catch (error) {
    checks.push({
      name: 'Node.js Version',
      status: 'fail',
      message: 'Could not detect Node.js version',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function checkNpmVersion(checks: HealthCheck[]): Promise<void> {
  try {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(version.split('.')[0] || '0', 10);

    if (majorVersion >= 9) {
      checks.push({
        name: 'npm Version',
        status: 'pass',
        message: `${version} (>= 9.0.0)`,
      });
    } else {
      checks.push({
        name: 'npm Version',
        status: 'warn',
        message: `${version} is older than recommended`,
        details: 'Consider upgrading to npm >= 9.0.0 for best performance',
      });
    }
  } catch {
    checks.push({
      name: 'npm Version',
      status: 'fail',
      message: 'npm not found or not working',
      details: 'Please install npm or check your PATH',
    });
  }
}

async function checkWorkspaceStructure(
  checks: HealthCheck[],
  context: CommandContext,
): Promise<void> {
  const requiredPaths = [
    'packages/cli',
    'packages/core',
    'packages/server',
    'packages/templates',
    'packages/testing',
  ];

  const missing = requiredPaths.filter((path) => !existsSync(join(context.workingDir, path)));

  if (missing.length === 0) {
    checks.push({
      name: 'Workspace Structure',
      status: 'pass',
      message: 'All required packages present',
    });
  } else {
    checks.push({
      name: 'Workspace Structure',
      status: 'fail',
      message: `Missing packages: ${missing.join(', ')}`,
      details: 'Run from the Context-Pods root directory',
    });
  }
}

async function checkPackageBuild(checks: HealthCheck[], context: CommandContext): Promise<void> {
  const packageDirs = ['packages/cli', 'packages/core', 'packages/server'];
  const unbuiltPackages = packageDirs.filter((pkg) => {
    const distPath = join(context.workingDir, pkg, 'dist');
    return !existsSync(distPath);
  });

  if (unbuiltPackages.length === 0) {
    checks.push({
      name: 'Package Build Status',
      status: 'pass',
      message: 'All packages are built',
    });
  } else {
    checks.push({
      name: 'Package Build Status',
      status: 'warn',
      message: `Unbuilt packages: ${unbuiltPackages.join(', ')}`,
      details: 'Run "npm run build" to build all packages',
      fix: async () => {
        execSync('npm run build', { stdio: 'inherit', cwd: context.workingDir });
      },
    });
  }
}

async function checkTemplatesAvailability(
  checks: HealthCheck[],
  context: CommandContext,
): Promise<void> {
  if (context.templatePaths.length === 0) {
    checks.push({
      name: 'Templates Availability',
      status: 'fail',
      message: 'No template paths found',
      details: 'Check CONTEXT_PODS_TEMPLATES_PATH or ensure templates are installed',
    });
    return;
  }

  let templateCount = 0;
  for (const templatePath of context.templatePaths) {
    if (existsSync(templatePath)) {
      try {
        const entries = await readFile(join(templatePath, '..', 'package.json'), 'utf8');
        if (entries.includes('@context-pods/templates')) {
          templateCount++;
        }
      } catch {
        // Ignore errors, might be custom templates
      }
    }
  }

  if (templateCount > 0) {
    checks.push({
      name: 'Templates Availability',
      status: 'pass',
      message: `Found templates in ${templateCount} location(s)`,
    });
  } else {
    checks.push({
      name: 'Templates Availability',
      status: 'warn',
      message: 'No official templates found',
      details: 'Templates may not be installed or path may be incorrect',
    });
  }
}

async function checkTurboConfig(checks: HealthCheck[], context: CommandContext): Promise<void> {
  const turboConfigPath = join(context.workingDir, 'turbo.json');

  if (existsSync(turboConfigPath)) {
    checks.push({
      name: 'Turbo Configuration',
      status: 'pass',
      message: 'turbo.json found',
    });
  } else {
    checks.push({
      name: 'Turbo Configuration',
      status: 'warn',
      message: 'turbo.json not found',
      details: 'TurboRepo configuration missing - monorepo features may not work',
    });
  }
}

async function checkGitRepository(checks: HealthCheck[], context: CommandContext): Promise<void> {
  const gitPath = join(context.workingDir, '.git');

  if (existsSync(gitPath)) {
    try {
      execSync('git status', { stdio: 'pipe', cwd: context.workingDir });
      checks.push({
        name: 'Git Repository',
        status: 'pass',
        message: 'Git repository is functional',
      });
    } catch {
      checks.push({
        name: 'Git Repository',
        status: 'warn',
        message: 'Git repository exists but may have issues',
        details: 'Check git status manually',
      });
    }
  } else {
    checks.push({
      name: 'Git Repository',
      status: 'warn',
      message: 'Not a git repository',
      details: 'Version control is recommended for Context-Pods development',
    });
  }
}

async function checkDependencies(checks: HealthCheck[], context: CommandContext): Promise<void> {
  const nodeModulesPath = join(context.workingDir, 'node_modules');

  if (!existsSync(nodeModulesPath)) {
    checks.push({
      name: 'Dependencies',
      status: 'fail',
      message: 'node_modules not found',
      details: 'Run "npm install" to install dependencies',
      fix: async () => {
        execSync('npm install', { stdio: 'inherit', cwd: context.workingDir });
      },
    });
    return;
  }

  // Check for key dependencies
  const keyDeps = ['@modelcontextprotocol/sdk', 'commander', 'inquirer', 'chalk'];
  const missingDeps = keyDeps.filter((dep) => !existsSync(join(nodeModulesPath, dep)));

  if (missingDeps.length === 0) {
    checks.push({
      name: 'Dependencies',
      status: 'pass',
      message: 'All key dependencies installed',
    });
  } else {
    checks.push({
      name: 'Dependencies',
      status: 'warn',
      message: `Missing dependencies: ${missingDeps.join(', ')}`,
      details: 'Run "npm install" to install missing dependencies',
    });
  }
}

async function checkMCPServerHealth(checks: HealthCheck[], context: CommandContext): Promise<void> {
  const serverPath = join(context.workingDir, 'packages/server/dist/index.js');

  if (!existsSync(serverPath)) {
    checks.push({
      name: 'MCP Server',
      status: 'warn',
      message: 'MCP Server not built',
      details: 'Build the server package to enable MCP functionality',
    });
    return;
  }

  // Basic syntax check
  try {
    execSync(`node -c "${serverPath}"`, { stdio: 'pipe' });
    checks.push({
      name: 'MCP Server',
      status: 'pass',
      message: 'MCP Server is ready',
    });
  } catch {
    checks.push({
      name: 'MCP Server',
      status: 'fail',
      message: 'MCP Server has syntax errors',
      details: 'Check server build logs for details',
    });
  }
}

async function attemptFixes(checks: HealthCheck[]): Promise<void> {
  const fixableChecks = checks.filter((check) => check.status === 'fail' && check.fix);

  if (fixableChecks.length === 0) {
    output.warn('No automatic fixes available');
    return;
  }

  for (const check of fixableChecks) {
    try {
      output.info(`🔧 Fixing: ${check.name}`);
      await check.fix!();
      output.success(`✅ Fixed: ${check.name}`);
    } catch (error) {
      output.error(`❌ Failed to fix: ${check.name}`);
      output.error(`   ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
