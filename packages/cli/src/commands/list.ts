/**
 * List command implementation
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { CommandContext, CommandResult, MCPInfo } from '../types/cli-types.js';
import { output } from '../utils/output-formatter.js';

/**
 * List generated MCP servers
 */
export async function listCommand(
  options: { all?: boolean; format?: 'table' | 'json' },
  context: CommandContext,
): Promise<CommandResult> {
  try {
    output.startSpinner('Scanning for MCP servers...');

    const mcps = await findMCPServers(context);

    output.stopSpinner();

    if (mcps.length === 0) {
      output.info('No MCP servers found');
      return {
        success: true,
        message: 'No MCP servers found',
        data: [],
      };
    }

    // Filter inactive servers if not showing all
    const filteredMCPs = options.all ? mcps : mcps.filter((mcp) => mcp.status !== 'inactive');

    if (options.format === 'json') {
      console.log(JSON.stringify(filteredMCPs, null, 2));
    } else {
      displayMCPTable(filteredMCPs);
    }

    return {
      success: true,
      message: `Found ${filteredMCPs.length} MCP server(s)`,
      data: filteredMCPs,
    };
  } catch (error) {
    output.stopSpinner();
    output.error('Failed to list MCP servers', error as Error);
    return {
      success: false,
      error: error as Error,
      message: error instanceof Error ? error.message : 'Failed to list MCPs',
    };
  }
}

/**
 * Find MCP servers in the output directory
 */
async function findMCPServers(context: CommandContext): Promise<MCPInfo[]> {
  const mcps: MCPInfo[] = [];
  const outputDir = context.outputPath;

  try {
    // Check if output directory exists
    await fs.access(outputDir);

    const entries = await fs.readdir(outputDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const mcpPath = path.join(outputDir, entry.name);
        const mcpInfo = await analyzeMCPDirectory(entry.name, mcpPath);

        if (mcpInfo) {
          mcps.push(mcpInfo);
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    // Output directory doesn't exist, return empty array
  }

  return mcps.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

/**
 * Analyze a directory to determine if it's an MCP server
 */
async function analyzeMCPDirectory(name: string, mcpPath: string): Promise<MCPInfo | null> {
  try {
    const packageJsonPath = path.join(mcpPath, 'package.json');
    const stat = await fs.stat(mcpPath);

    // Check if it has a package.json
    let template: string | undefined;
    let status: 'active' | 'inactive' | 'error' = 'inactive';

    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Check if it looks like an MCP server
      if (
        packageJson.keywords?.includes('mcp') ||
        packageJson.keywords?.includes('model-context-protocol') ||
        packageJson.name?.includes('mcp')
      ) {
        status = 'active';

        // Try to determine template from package.json or other indicators
        template =
          packageJson['context-pods']?.template ||
          packageJson.template ||
          detectTemplateFromStructure(mcpPath);
      } else {
        // Not an MCP server, return null
        return null;
      }
    } catch {
      // No package.json or invalid JSON, check if it looks like an MCP project anyway
      const hasSrcDir = await pathExists(path.join(mcpPath, 'src'));
      const hasIndexFile =
        (await pathExists(path.join(mcpPath, 'src', 'index.ts'))) ||
        (await pathExists(path.join(mcpPath, 'src', 'index.js'))) ||
        (await pathExists(path.join(mcpPath, 'index.ts'))) ||
        (await pathExists(path.join(mcpPath, 'index.js')));

      if (hasSrcDir || hasIndexFile) {
        status = 'error'; // Looks like a project but has issues
      } else {
        return null; // Not an MCP server directory
      }
    }

    return {
      name,
      path: mcpPath,
      status,
      template,
      createdAt: stat.birthtime,
      lastModified: stat.mtime,
    };
  } catch {
    return null;
  }
}

/**
 * Detect template from directory structure
 */
async function detectTemplateFromStructure(mcpPath: string): Promise<string | undefined> {
  // Check for TypeScript
  if (await pathExists(path.join(mcpPath, 'tsconfig.json'))) {
    // Check for advanced TypeScript features
    const srcPath = path.join(mcpPath, 'src');
    const hasTools = await pathExists(path.join(srcPath, 'tools'));
    const hasResources = await pathExists(path.join(srcPath, 'resources'));

    if (hasTools && hasResources) {
      return 'typescript-advanced';
    } else {
      return 'basic';
    }
  }

  // Check for Python
  if (
    (await pathExists(path.join(mcpPath, 'requirements.txt'))) ||
    (await pathExists(path.join(mcpPath, 'main.py')))
  ) {
    return 'python-basic';
  }

  return undefined;
}

/**
 * Check if path exists
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Display MCP servers in table format
 */
function displayMCPTable(mcps: MCPInfo[]): void {
  output.info(`Found ${mcps.length} MCP server(s):`);
  output.divider();

  mcps.forEach((mcp, index) => {
    const statusColor = mcp.status === 'active' ? 'green' : mcp.status === 'error' ? 'red' : 'gray';
    const templateDisplay = mcp.template || 'Unknown';
    const relativeTime = formatRelativeTime(mcp.lastModified);

    output.info(`${index + 1}. ${output.package(mcp.name)}`);

    output.table([
      { label: '  Status', value: mcp.status, color: statusColor },
      { label: '  Template', value: templateDisplay, color: 'blue' },
      { label: '  Path', value: path.relative(process.cwd(), mcp.path), color: 'yellow' },
      { label: '  Modified', value: relativeTime, color: 'gray' },
    ]);

    if (index < mcps.length - 1) {
      console.log();
    }
  });

  output.divider();

  // Show summary statistics
  const statusCounts = mcps.reduce(
    (acc, mcp) => {
      acc[mcp.status] = (acc[mcp.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const summaryParts = Object.entries(statusCounts).map(([status, count]) => {
    // Could use color for future formatting enhancements
    // const color = status === 'active' ? 'green' : status === 'error' ? 'red' : 'gray';
    return `${count} ${status}`;
  });

  output.info(`Summary: ${summaryParts.join(', ')}`);
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}
