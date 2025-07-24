/**
 * Meta-MCP Server management commands
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { promises as fs } from 'fs';
import { output } from '../utils/output-formatter.js';
import type {
  CommandContext,
  CommandResult,
  ServerOptions,
  ServerStatus,
} from '../types/cli-types.js';

/**
 * Start the Meta-MCP Server
 */
export async function startServerCommand(
  options: ServerOptions,
  context: CommandContext,
): Promise<CommandResult> {
  try {
    output.info('🚀 Starting Context-Pods Meta-MCP Server...');

    // Check if server package is built
    const serverPath = join(context.workingDir, 'packages/server/dist/index.js');
    const serverExists = await fs
      .access(serverPath)
      .then(() => true)
      .catch(() => false);

    if (!serverExists) {
      output.warn('Server package not built. Building now...');

      // Build the server package
      const buildProcess = spawn('npm', ['run', 'build', '--workspace=packages/server'], {
        cwd: context.workingDir,
        stdio: options.verbose ? 'inherit' : 'pipe',
      });

      await new Promise((resolve, reject) => {
        buildProcess.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`Build failed with code ${code}`));
        });
      });
    }

    // Start the server
    const serverProcess = spawn('node', [serverPath], {
      cwd: context.workingDir,
      stdio: options.daemon ? 'pipe' : 'inherit',
      env: {
        ...process.env,
        NODE_ENV: options.dev ? 'development' : 'production',
        DEBUG: options.debug ? 'context-pods:*' : undefined,
      },
    });

    if (options.daemon) {
      // Save PID for daemon mode
      const pidFile = join(context.workingDir, '.context-pods-server.pid');
      await fs.writeFile(pidFile, serverProcess.pid?.toString() || '');

      output.success(`✅ Meta-MCP Server started in daemon mode (PID: ${serverProcess.pid})`);
      output.info('📖 See docs/MCP_CLIENT_SETUP.md for configuration instructions');

      return { success: true, data: { pid: serverProcess.pid } };
    } else {
      output.success('✅ Meta-MCP Server is running');
      output.info('📖 See docs/MCP_CLIENT_SETUP.md for configuration instructions');
      output.info('🛑 Press Ctrl+C to stop the server');

      // Wait for server to exit
      await new Promise((resolve) => {
        serverProcess.on('close', resolve);
      });

      return { success: true };
    }
  } catch (error) {
    output.error('Failed to start Meta-MCP Server', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Stop the Meta-MCP Server
 */
export async function stopServerCommand(
  _options: ServerOptions,
  context: CommandContext,
): Promise<CommandResult> {
  try {
    const pidFile = join(context.workingDir, '.context-pods-server.pid');

    try {
      const pidContent = await fs.readFile(pidFile, 'utf8');
      const pid = parseInt(pidContent.trim());

      if (pid && !isNaN(pid)) {
        output.info(`🛑 Stopping Meta-MCP Server (PID: ${pid})...`);

        // Try to kill the process
        process.kill(pid, 'SIGTERM');

        // Wait a moment for graceful shutdown
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if process is still running
        try {
          process.kill(pid, 0); // Check if process exists
          output.warn('Process still running, forcing shutdown...');
          process.kill(pid, 'SIGKILL');
        } catch {
          // Process already stopped
        }

        // Remove PID file
        await fs.unlink(pidFile);

        output.success('✅ Meta-MCP Server stopped');
        return { success: true };
      }
    } catch {
      // PID file doesn't exist or can't be read
    }

    output.warn('No running Meta-MCP Server found');
    return { success: true };
  } catch (error) {
    output.error('Failed to stop Meta-MCP Server', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get Meta-MCP Server status
 */
export async function statusServerCommand(
  _options: ServerOptions,
  context: CommandContext,
): Promise<CommandResult> {
  try {
    output.info('📊 Context-Pods Meta-MCP Server Status');
    output.info('==========================================');

    const status: ServerStatus = {
      running: false,
      built: false,
      configured: false,
      pid: undefined,
      uptime: undefined,
      version: '0.0.1',
    };

    // Check if server is built
    const serverPath = join(context.workingDir, 'packages/server/dist/index.js');
    status.built = await fs
      .access(serverPath)
      .then(() => true)
      .catch(() => false);

    // Check if server is running
    const pidFile = join(context.workingDir, '.context-pods-server.pid');
    try {
      const pidContent = await fs.readFile(pidFile, 'utf8');
      const pid = parseInt(pidContent.trim());

      if (pid && !isNaN(pid)) {
        try {
          process.kill(pid, 0); // Check if process exists
          status.running = true;
          status.pid = pid;
        } catch {
          // Process not running, clean up stale PID file
          await fs.unlink(pidFile).catch(() => {});
        }
      }
    } catch {
      // PID file doesn't exist
    }

    // Check configuration examples
    const configPath = join(context.workingDir, 'examples/claude-desktop-config.json');
    status.configured = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    // Display status
    output.table([
      { label: 'Status', value: status.running ? '🟢 Running' : '🔴 Stopped' },
      { label: 'Built', value: status.built ? '✅ Yes' : '❌ No' },
      { label: 'PID', value: status.pid?.toString() || 'N/A' },
      { label: 'Version', value: status.version },
      { label: 'Config Examples', value: status.configured ? '✅ Available' : '❌ Missing' },
    ]);

    if (!status.built) {
      output.warn('📝 Run "npm run build" to build the server');
    }

    if (!status.running) {
      output.info('📝 Run "context-pods server start" to start the server');
    }

    if (status.configured) {
      output.info('📖 See docs/MCP_CLIENT_SETUP.md for setup instructions');
    }

    return { success: true, data: status };
  } catch (error) {
    output.error('Failed to get server status', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Test Meta-MCP Server connection
 */
export async function testServerCommand(
  options: ServerOptions,
  context: CommandContext,
): Promise<CommandResult> {
  try {
    output.info('🔍 Testing Context-Pods Meta-MCP Server connection...');

    // Run the test script
    const testScript = join(context.workingDir, 'scripts/test-connection.mjs');
    const testExists = await fs
      .access(testScript)
      .then(() => true)
      .catch(() => false);

    if (!testExists) {
      output.error('Test script not found at scripts/test-connection.mjs');
      return { success: false, error: new Error('Test script not found') };
    }

    const testProcess = spawn('node', [testScript], {
      cwd: context.workingDir,
      stdio: options.verbose ? 'inherit' : 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    let output_data = '';
    if (!options.verbose) {
      testProcess.stdout?.on('data', (data) => {
        output_data += data.toString();
      });
      testProcess.stderr?.on('data', (data) => {
        output_data += data.toString();
      });
    }

    const exitCode = await new Promise<number>((resolve) => {
      testProcess.on('close', resolve);
    });

    if (exitCode === 0) {
      if (!options.verbose) {
        output.success('✅ Meta-MCP Server test passed');
        output.info('🎉 Server is working correctly');
      }
      return { success: true };
    } else {
      if (!options.verbose) {
        output.error('❌ Meta-MCP Server test failed');
        output.debug(`Test output: ${output_data}`);
      }
      return { success: false, error: new Error('Test failed') };
    }
  } catch (error) {
    output.error('Failed to test Meta-MCP Server', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Start Meta-MCP Server in development mode
 */
export async function devServerCommand(
  _options: ServerOptions,
  context: CommandContext,
): Promise<CommandResult> {
  try {
    output.info('🛠️ Starting Context-Pods Meta-MCP Server in development mode...');

    // Run the dev script
    const devScript = join(context.workingDir, 'scripts/dev-server.sh');
    const devExists = await fs
      .access(devScript)
      .then(() => true)
      .catch(() => false);

    if (!devExists) {
      output.error('Development script not found at scripts/dev-server.sh');
      return { success: false, error: new Error('Development script not found') };
    }

    const devProcess = spawn('bash', [devScript], {
      cwd: context.workingDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DEBUG: 'context-pods:*',
      },
    });

    // Wait for dev server to exit
    await new Promise<number>((resolve) => {
      devProcess.on('close', resolve);
    });

    return { success: true };
  } catch (error) {
    output.error('Failed to start development server', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
