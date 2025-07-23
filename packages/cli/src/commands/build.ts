/**
 * Build command implementation
 */

import { BuildOptions, CommandContext, CommandResult } from '../types/cli-types.js';
import { output } from '../utils/output-formatter.js';
import { TurboIntegration } from '../utils/turbo-integration.js';

/**
 * Build packages using TurboRepo
 */
export async function buildCommand(
  target: string | undefined,
  options: BuildOptions,
  context: CommandContext
): Promise<CommandResult> {
  try {
    const turbo = new TurboIntegration(context.workingDir, context.config);
    const isAvailable = await turbo.isAvailable();
    
    if (!isAvailable) {
      return await fallbackBuild(target, options, context);
    }
    
    // Clean before building if requested
    if (options.clean) {
      output.info('Cleaning build artifacts...');
      await turbo.clean(target, context.verbose);
    }
    
    // Run build
    output.info(`Building ${target || 'all packages'}...`);
    await turbo.build(target, context.verbose);
    
    return {
      success: true,
      message: 'Build completed successfully',
    };
    
  } catch (error) {
    output.error('Build failed', error as Error);
    return {
      success: false,
      error: error as Error,
      message: error instanceof Error ? error.message : 'Build failed',
    };
  }
}

/**
 * Fallback build without TurboRepo
 */
async function fallbackBuild(
  target: string | undefined,
  _options: BuildOptions,
  context: CommandContext
): Promise<CommandResult> {
  output.warn('TurboRepo not available, using fallback build');
  
  try {
    const { execa } = await import('execa');
    
    if (target) {
      // Build specific target
      const targetPath = `packages/${target}`;
      output.info(`Building ${target}...`);
      
      await execa('npm', ['run', 'build'], {
        cwd: targetPath,
        stdio: context.verbose ? 'inherit' : 'pipe',
      });
    } else {
      // Build all packages
      output.info('Building all packages...');
      
      await execa('npm', ['run', 'build'], {
        cwd: context.workingDir,
        stdio: context.verbose ? 'inherit' : 'pipe',
      });
    }
    
    output.success('Build completed successfully');
    
    return {
      success: true,
      message: 'Build completed successfully (fallback mode)',
    };
    
  } catch (error) {
    output.error('Fallback build failed', error as Error);
    return {
      success: false,
      error: error as Error,
      message: 'Fallback build failed',
    };
  }
}