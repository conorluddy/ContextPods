/**
 * Main CLI entry point for Context-Pods
 */

// import { TurboIntegration } from './utils/turbo-integration.js'; // Unused for now
import { getAllExistingTemplatePaths } from '@context-pods/core';
import { getTemplatesPath } from '@context-pods/templates';
import { Command } from 'commander';

// Import command handlers (these will be implemented next)
import { buildCommand } from './commands/build.js';
import { devCommand } from './commands/dev.js';
import { doctorCommand } from './commands/doctor.js';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import {
  startServerCommand,
  stopServerCommand,
  statusServerCommand,
  testServerCommand,
  devServerCommand,
} from './commands/server.js';
import { templatesCommand } from './commands/templates.js';
import { testCommand } from './commands/test.js';
import { wizardCommand } from './commands/wizard.js';
import { wrapCommand } from './commands/wrap.js';
import { configManager } from './config/index.js';
import type { CommandContext } from './types/cli-types.js';
import { CacheManager } from './utils/cache-manager.js';
import { output } from './utils/output-formatter.js';

/**
 * Create and configure the CLI program
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('context-pods')
    .description('TurboRepo-optimized CLI for Context-Pods MCP development suite')
    .version('0.0.1')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-c, --config <path>', 'Path to config file')
    .hook('preAction', async (thisCommand, _actionCommand) => {
      // Set up global verbose mode
      const options = thisCommand.opts();
      output.setVerbose(options.verbose || false);

      if (options.verbose) {
        output.debug('Verbose mode enabled');
      }
    });

  // Wrap command - Convert scripts to MCP servers
  program
    .command('wrap')
    .description(
      `Wrap a script as an MCP server

Examples:
  context-pods wrap ./my-script.py --name python-tools
  context-pods wrap ./data-processor.js --name data-tools --output ./generated
  context-pods wrap ./backup.sh --name backup-server --description "Server for backup operations"`,
    )
    .argument('<script>', 'Path to the script file to wrap')
    .option('-t, --template <name>', 'Template to use (auto-detected if not specified)')
    .option('-o, --output <path>', 'Output directory')
    .option('-n, --name <name>', 'MCP server name')
    .option('-d, --description <text>', 'MCP server description')
    .option('-f, --force', 'Overwrite existing files')
    .action(async (script, options, command) => {
      const context = await createCommandContext(command);
      await wrapCommand(script, options, context);
    });

  // Generate command - Generate MCP server from template
  program
    .command('generate [template]')
    .description(
      `Generate an MCP server from a template

Examples:
  context-pods generate                                    # Interactive template selection
  context-pods generate typescript-basic --name weather-api
  context-pods generate python-basic --name data-processor --output ./servers
  context-pods generate rust-advanced --name file-manager --var "port=3001"
  context-pods generate --generate-mcp-config --config-name my-server`,
    )
    .option('-o, --output <path>', 'Output directory')
    .option('-n, --name <name>', 'MCP server name')
    .option('-d, --description <text>', 'MCP server description')
    .option('-f, --force', 'Overwrite existing files')
    .option('--var <key=value...>', 'Template variables (can be used multiple times)')
    .option('--generate-mcp-config', 'Generate .mcp.json configuration file')
    .option('--config-name <name>', 'Name for MCP server in config')
    .option('--config-path <path>', 'Path for .mcp.json file')
    .option('--command <command>', 'Command to run the MCP server')
    .option('--args <args...>', 'Arguments for the MCP server command')
    .option('--env <key=value...>', 'Environment variables (can be used multiple times)')
    .action(async (template, options, command) => {
      const context = await createCommandContext(command);
      await generateCommand(template, options, context);
    });

  // Development command - Start development mode
  program
    .command('dev [target]')
    .description('Start development mode with hot reloading')
    .option('-p, --port <number>', 'Development server port', '3001')
    .option('--no-hot-reload', 'Disable hot reloading')
    .option('--open', 'Open browser automatically')
    .action(async (target, options, command) => {
      const context = await createCommandContext(command);
      await devCommand(target, options, context);
    });

  // Build command - Build packages
  program
    .command('build [target]')
    .description('Build packages using TurboRepo')
    .option('--clean', 'Clean before building')
    .option('--no-cache', 'Disable build cache')
    .option('--sourcemap', 'Generate source maps')
    .option('--minify', 'Minify output')
    .action(async (target, options, command) => {
      const context = await createCommandContext(command);
      await buildCommand(target, options, context);
    });

  // Test command - Run tests
  program
    .command('test [target]')
    .description('Run tests using TurboRepo')
    .option('--coverage', 'Generate coverage report')
    .option('--watch', 'Watch mode')
    .action(async (target, options, command) => {
      const context = await createCommandContext(command);
      await testCommand(target, options, context);
    });

  // List command - List generated MCPs
  program
    .command('list')
    .description(
      `List generated MCP servers

Examples:
  context-pods list                        # Show active MCP servers in table format
  context-pods list --all                  # Show all MCP servers including inactive
  context-pods list --format json         # Output as JSON for scripting`,
    )
    .option('-a, --all', 'Show all MCPs including inactive')
    .option('-f, --format <type>', 'Output format (table, json)', 'table')
    .action(async (options, command) => {
      const context = await createCommandContext(command);
      await listCommand(options, context);
    });

  // Templates command - Manage templates
  program
    .command('templates')
    .description(
      `List available templates

Examples:
  context-pods templates                   # Show available templates in table format
  context-pods templates --all             # Show all templates including custom ones
  context-pods templates --format json    # Output as JSON for scripting`,
    )
    .option('-a, --all', 'Show all templates including custom')
    .option('-f, --format <type>', 'Output format (table, json)', 'table')
    .action(async (options, command) => {
      const context = await createCommandContext(command);
      await templatesCommand(options, context);
    });

  // Init command - Initialize project configuration
  program
    .command('init [name]')
    .description(
      `Initialize Context-Pods project configuration

Examples:
  context-pods init                        # Interactive project setup
  context-pods init my-mcp-project         # Initialize with project name
  context-pods init --template typescript-basic --description "My MCP project"`,
    )
    .option('-t, --template <name>', 'Preferred template')
    .option('-d, --description <text>', 'Project description')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(async (name, options, command) => {
      const context = await createCommandContext(command);
      await initCommand(name, options, context);
    });

  // Doctor command - System health check and troubleshooting
  program
    .command('doctor')
    .description(
      `Run system health checks and diagnostics

Examples:
  context-pods doctor                      # Run all health checks
  context-pods doctor --verbose           # Show detailed information
  context-pods doctor --fix               # Automatically fix detected issues`,
    )
    .option('-v, --verbose', 'Show detailed information for all checks')
    .option('--fix', 'Attempt to automatically fix issues')
    .action(async (options, command) => {
      const context = await createCommandContext(command);
      await doctorCommand(options, context);
    });

  // Wizard command - Interactive guided setup
  program
    .command('wizard')
    .description(
      `Interactive wizard for first-time users

Examples:
  context-pods wizard                      # Full interactive setup wizard
  context-pods wizard --skip-intro        # Skip welcome message`,
    )
    .option('--skip-intro', 'Skip the welcome message and introduction')
    .action(async (options, command) => {
      const context = await createCommandContext(command);
      await wizardCommand(options, context);
    });

  // Cache command - Manage cache
  const cacheCommand = program.command('cache').description('Manage CLI cache');

  cacheCommand
    .command('clear [namespace]')
    .description('Clear cache (optionally specify namespace)')
    .action(async (namespace, _options, command) => {
      const context = await createCommandContext(command.parent?.parent as Command);
      const cacheManager = new CacheManager(context.config);

      if (namespace) {
        await cacheManager.clearNamespace(namespace);
        output.success(`Cleared cache namespace: ${namespace}`);
      } else {
        await cacheManager.clearAll();
      }
    });

  cacheCommand
    .command('stats')
    .description('Show cache statistics')
    .action(async (_options, command) => {
      const context = await createCommandContext(command.parent?.parent as Command);
      const cacheManager = new CacheManager(context.config);
      const stats = await cacheManager.getStats();

      output.table([
        { label: 'Entries', value: stats.entries.toString() },
        { label: 'Total Size', value: `${Math.round(stats.totalSize / 1024)} KB` },
        { label: 'Oldest Entry', value: new Date(stats.oldestEntry).toLocaleString() },
        { label: 'Newest Entry', value: new Date(stats.newestEntry).toLocaleString() },
      ]);
    });

  cacheCommand
    .command('clean')
    .description('Clean expired cache entries')
    .action(async (_options, command) => {
      const context = await createCommandContext(command.parent?.parent as Command);
      const cacheManager = new CacheManager(context.config);
      const cleaned = await cacheManager.cleanExpired();

      output.success(`Cleaned ${cleaned} expired cache entries`);
    });

  // Server command - Manage Meta-MCP Server
  const serverCommand = program.command('server').description('Manage the Meta-MCP Server');

  serverCommand
    .command('start')
    .description('Start the Meta-MCP Server')
    .option('-d, --daemon', 'Run as daemon')
    .option('--dev', 'Development mode')
    .option('--debug', 'Enable debug logging')
    .action(async (options, command) => {
      const context = await createCommandContext(command.parent?.parent as Command);
      await startServerCommand(options, context);
    });

  serverCommand
    .command('stop')
    .description('Stop the Meta-MCP Server')
    .action(async (options, command) => {
      const context = await createCommandContext(command.parent?.parent as Command);
      await stopServerCommand(options, context);
    });

  serverCommand
    .command('status')
    .description('Show Meta-MCP Server status')
    .action(async (options, command) => {
      const context = await createCommandContext(command.parent?.parent as Command);
      await statusServerCommand(options, context);
    });

  serverCommand
    .command('test')
    .description('Test Meta-MCP Server connection')
    .action(async (options, command) => {
      const context = await createCommandContext(command.parent?.parent as Command);
      await testServerCommand(options, context);
    });

  serverCommand
    .command('dev')
    .description('Start Meta-MCP Server in development mode')
    .action(async (options, command) => {
      const context = await createCommandContext(command.parent?.parent as Command);
      await devServerCommand(options, context);
    });

  // Config command - Manage configuration
  const configCommand = program.command('config').description('Manage CLI configuration');

  configCommand
    .command('show')
    .description('Show current configuration')
    .action(async (_options, _command) => {
      const { global, project } = await configManager.getConfig();

      output.info('Global Configuration:');
      console.log(JSON.stringify(global, null, 2));

      if (project) {
        output.info('\nProject Configuration:');
        console.log(JSON.stringify(project, null, 2));
      } else {
        output.warn('\nNo project configuration found');
      }
    });

  configCommand
    .command('reset')
    .description('Reset global configuration to defaults')
    .action(async () => {
      await configManager.resetGlobalConfig();
      output.success('Global configuration reset to defaults');
    });

  return program;
}

/**
 * Create command execution context
 */
async function createCommandContext(command: Command): Promise<CommandContext> {
  const options = command.opts();
  const { global, project } = await configManager.getConfig();

  const workingDir = process.cwd();

  // Use consolidated path resolution from core package
  // First, try to get templates from the installed package
  const installedTemplatesPath = getTemplatesPath();

  const templatePaths = getAllExistingTemplatePaths({
    envVar: 'CONTEXT_PODS_TEMPLATES_PATH',
    additionalPaths: [
      installedTemplatesPath, // Add the installed templates path first
      global.templatesPath.startsWith('/')
        ? global.templatesPath
        : `${workingDir}/${global.templatesPath}`,
      `${workingDir}/templates`,
      `${workingDir}/../templates`,
    ],
  });

  const outputPath = options.output || project?.output.directory || global.outputPath;

  return {
    config: global,
    projectConfig: project,
    workingDir,
    templatePaths,
    outputPath,
    verbose: options.verbose || false,
  };
}

/**
 * Main CLI entry point
 */
export async function main(argv: string[]): Promise<void> {
  try {
    const program = createProgram();
    await program.parseAsync(argv);
  } catch (error) {
    output.error('CLI execution failed', error as Error);
    process.exit(1);
  }
}

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error) => {
  output.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  output.error('Unhandled rejection', reason as Error);
  process.exit(1);
});

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  output.info('\nGracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  output.info('\nGracefully shutting down...');
  process.exit(0);
});
