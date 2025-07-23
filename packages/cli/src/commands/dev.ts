/**
 * Development command implementation
 */

import chokidar from 'chokidar';
import { DevOptions, CommandContext, CommandResult } from '../types/cli-types.js';
import { output } from '../utils/output-formatter.js';
import { TurboIntegration } from '../utils/turbo-integration.js';

/**
 * Start development mode with hot reloading
 */
export async function devCommand(
  target: string | undefined,
  options: DevOptions,
  context: CommandContext
): Promise<CommandResult> {
  try {
    output.info('Starting development mode...');
    
    const turbo = new TurboIntegration(context.workingDir, context.config);
    const isAvailable = await turbo.isAvailable();
    
    if (!isAvailable) {
      output.warn('TurboRepo not available, falling back to basic development mode');
      return await basicDevMode(target, options, context);
    }
    
    output.info(`Development server starting on port ${options.port || context.config.dev.port}`);
    
    if (options.hotReload !== false && context.config.dev.hotReload) {
      setupHotReload(context);
    }
    
    // Start TurboRepo development mode
    await turbo.dev(target, context.verbose);
    
    return {
      success: true,
      message: 'Development mode started successfully',
    };
    
  } catch (error) {
    output.error('Failed to start development mode', error as Error);
    return {
      success: false,
      error: error as Error,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Basic development mode without TurboRepo
 */
async function basicDevMode(
  _target: string | undefined,
  options: DevOptions,
  context: CommandContext
): Promise<CommandResult> {
  output.info('Starting basic development mode...');
  
  if (options.hotReload !== false) {
    setupHotReload(context);
  }
  
  output.success('Development mode running (basic mode)');
  output.info('Press Ctrl+C to stop');
  
  // Keep the process alive
  return new Promise(() => {
    // This will run indefinitely until stopped
  });
}

/**
 * Set up hot reloading file watcher
 */
function setupHotReload(context: CommandContext): void {
  const watchPatterns = context.config.dev.watchPatterns;
  
  output.info('Setting up hot reload...');
  
  const watcher = chokidar.watch(watchPatterns, {
    cwd: context.workingDir,
    ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    persistent: true,
  });
  
  watcher
    .on('change', (path) => {
      output.info(`File changed: ${output.path(path)}`);
      output.debug('Triggering hot reload...');
    })
    .on('add', (path) => {
      output.debug(`File added: ${output.path(path)}`);
    })
    .on('unlink', (path) => {
      output.debug(`File removed: ${output.path(path)}`);
    })
    .on('error', (error) => {
      output.error('File watcher error', error);
    });
  
  output.success('Hot reload enabled');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    watcher.close();
    output.info('File watcher stopped');
  });
}