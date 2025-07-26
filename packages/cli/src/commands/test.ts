/**
 * Test command implementation
 */

import type { TestOptions, CommandContext, CommandResult } from '../types/cli-types.js';
import { output } from '../utils/output-formatter.js';
import { TurboIntegration } from '../utils/turbo-integration.js';

/**
 * Run tests using TurboRepo
 */
export async function testCommand(
  target: string | undefined,
  options: TestOptions,
  context: CommandContext,
): Promise<CommandResult> {
  try {
    const turbo = new TurboIntegration(context.workingDir, context.config);
    const isAvailable = await turbo.isAvailable();

    if (!isAvailable) {
      return await fallbackTest(target, options, context);
    }

    // Run tests
    output.info(`Running tests for ${target || 'all packages'}...`);
    await turbo.test(target, context.verbose);

    return {
      success: true,
      message: 'Tests completed successfully',
    };
  } catch (error) {
    output.error('Tests failed', error as Error);
    return {
      success: false,
      error: error as Error,
      message: error instanceof Error ? error.message : 'Tests failed',
    };
  }
}

/**
 * Fallback test without TurboRepo
 */
async function fallbackTest(
  target: string | undefined,
  options: TestOptions,
  context: CommandContext,
): Promise<CommandResult> {
  output.warn('TurboRepo not available, using fallback test');

  try {
    const { execa } = await import('execa');

    const testArgs = ['run', 'test'];

    if (options.coverage) {
      testArgs.push('--', '--coverage');
    }

    if (options.watch) {
      testArgs.push('--', '--watch');
    }

    if (target) {
      // Test specific target
      const targetPath = `packages/${target}`;
      output.info(`Testing ${target}...`);

      await execa('npm', testArgs, {
        cwd: targetPath,
        stdio: context.verbose ? 'inherit' : 'pipe',
      });
    } else {
      // Test all packages
      output.info('Testing all packages...');

      await execa('npm', testArgs, {
        cwd: context.workingDir,
        stdio: context.verbose ? 'inherit' : 'pipe',
      });
    }

    output.success('Tests completed successfully');

    return {
      success: true,
      message: 'Tests completed successfully (fallback mode)',
    };
  } catch (error) {
    output.error('Fallback tests failed', error as Error);
    return {
      success: false,
      error: error as Error,
      message: 'Fallback tests failed',
    };
  }
}
