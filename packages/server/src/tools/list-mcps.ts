/**
 * List MCP servers tool
 */

import { BaseTool, type ToolResult } from './base-tool.js';
import { getRegistryOperations, MCPServerStatus, type MCPServerFilters } from '../registry/index.js';

/**
 * Arguments for list-mcps tool
 */
interface ListMCPsArgs extends Record<string, unknown> {
  filter?: string;
  status?: string;
  template?: string;
  language?: string;
  search?: string;
  format?: 'table' | 'json' | 'summary';
}

/**
 * List MCP servers tool implementation
 */
export class ListMCPsTool extends BaseTool {
  constructor() {
    super('list-mcps');
  }

  /**
   * Validate list-mcps arguments
   */
  protected async validateArguments(args: unknown): Promise<string | null> {
    const typedArgs = args as ListMCPsArgs;

    // Validate optional arguments
    if (typedArgs.filter !== undefined) {
      const error = this.validateStringArgument(typedArgs, 'filter', false);
      if (error) return error;
    }

    if (typedArgs.status !== undefined) {
      const error = this.validateStringArgument(typedArgs, 'status', false);
      if (error) return error;

      // Validate status value
      const validStatuses = Object.values(MCPServerStatus);
      if (!validStatuses.includes(typedArgs.status as MCPServerStatus)) {
        return `Invalid status. Valid values: ${validStatuses.join(', ')}`;
      }
    }

    if (typedArgs.template !== undefined) {
      const error = this.validateStringArgument(typedArgs, 'template', false);
      if (error) return error;
    }

    if (typedArgs.language !== undefined) {
      const error = this.validateStringArgument(typedArgs, 'language', false);
      if (error) return error;
    }

    if (typedArgs.search !== undefined) {
      const error = this.validateStringArgument(typedArgs, 'search', false);
      if (error) return error;
    }

    if (typedArgs.format !== undefined) {
      const validFormats = ['table', 'json', 'summary'];
      if (!validFormats.includes(typedArgs.format)) {
        return `Invalid format. Valid values: ${validFormats.join(', ')}`;
      }
    }

    return null;
  }

  /**
   * Execute list-mcps tool
   */
  protected async execute(args: unknown): Promise<ToolResult> {
    const typedArgs = args as ListMCPsArgs;

    try {
      // Build filters
      const filters = this.buildFilters(typedArgs);

      // Get servers from registry
      const registry = await getRegistryOperations();
      const servers = await registry.listServers(filters);

      // Format output based on requested format
      const format = typedArgs.format || 'table';
      let output: string;

      switch (format) {
        case 'json':
          output = this.formatAsJSON(servers);
          break;
        case 'summary':
          output = await this.formatAsSummary(servers, registry);
          break;
        case 'table':
        default:
          output = this.formatAsTable(servers);
          break;
      }

      return {
        success: true,
        data: output,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build filters from arguments
   */
  private buildFilters(args: ListMCPsArgs): MCPServerFilters {
    const filters: MCPServerFilters = {};

    if (args.status) {
      filters.status = args.status as MCPServerStatus;
    }

    if (args.template) {
      filters.template = args.template;
    }

    if (args.language) {
      filters.language = args.language;
    }

    if (args.search) {
      filters.search = args.search;
    }

    // Handle legacy 'filter' parameter
    if (args.filter) {
      // Try to parse as status first
      const validStatuses = Object.values(MCPServerStatus);
      if (validStatuses.includes(args.filter as MCPServerStatus)) {
        filters.status = args.filter as MCPServerStatus;
      } else {
        // Use as search term
        filters.search = args.filter;
      }
    }

    return filters;
  }

  /**
   * Format servers as table
   */
  private formatAsTable(servers: any[]): string {
    if (servers.length === 0) {
      return '📦 No MCP servers found.\n\nUse the "create-mcp" or "wrap-script" tools to generate your first MCP server.';
    }

    let output = `📦 Managed MCP Servers (${servers.length} total)\n\n`;

    // Table header
    output += '┌─────────────────┬──────────────┬─────────────────┬──────────────────┬─────────────────┐\n';
    output += '│ Name            │ Status       │ Template        │ Language         │ Created         │\n';
    output += '├─────────────────┼──────────────┼─────────────────┼──────────────────┼─────────────────┤\n';

    // Table rows
    for (const server of servers) {
      const name = this.truncate(server.name, 15);
      const status = this.getStatusEmoji(server.status) + ' ' + this.truncate(server.status, 10);
      const template = this.truncate(server.template, 15);
      const language = this.truncate(server.metadata.language || 'unknown', 16);
      const created = this.formatDate(server.createdAt);

      output += `│ ${this.pad(name, 15)} │ ${this.pad(status, 12)} │ ${this.pad(template, 15)} │ ${this.pad(language, 16)} │ ${this.pad(created, 15)} │\n`;
    }

    output += '└─────────────────┴──────────────┴─────────────────┴──────────────────┴─────────────────┘\n';

    // Add usage information
    output += '\n💡 Use "list-mcps --format=json" for detailed information';
    output += '\n💡 Filter by status: "list-mcps --status=ready"';
    output += '\n💡 Search: "list-mcps --search=my-server"';

    return output;
  }

  /**
   * Format servers as JSON
   */
  private formatAsJSON(servers: any[]): string {
    if (servers.length === 0) {
      return JSON.stringify({
        servers: [],
        count: 0,
        message: 'No MCP servers found',
      }, null, 2);
    }

    return JSON.stringify({
      servers: servers.map(server => ({
        id: server.id,
        name: server.name,
        status: server.status,
        template: server.template,
        path: server.path,
        language: server.metadata.language,
        description: server.metadata.description,
        tags: server.metadata.tags,
        turboOptimized: server.metadata.turboOptimized,
        buildCommand: server.metadata.buildCommand,
        devCommand: server.metadata.devCommand,
        lastBuildStatus: server.metadata.lastBuildStatus,
        lastBuildTime: server.metadata.lastBuildTime,
        errorMessage: server.metadata.errorMessage,
        createdAt: server.createdAt,
        updatedAt: server.updatedAt,
      })),
      count: servers.length,
    }, null, 2);
  }

  /**
   * Format servers as summary
   */
  private async formatAsSummary(servers: any[], registry: any): Promise<string> {
    const stats = await registry.getStatistics();

    let output = `📊 MCP Servers Summary\n\n`;

    // Overall statistics
    output += `📈 Statistics:\n`;
    output += `- Total servers: ${stats.total}\n`;
    output += `- Recently created: ${stats.recentlyCreated} (last 24h)\n\n`;

    // Status breakdown
    output += `📋 By Status:\n`;
    for (const [status, count] of Object.entries(stats.byStatus)) {
      if ((count as number) > 0) {
        const emoji = this.getStatusEmoji(status as MCPServerStatus);
        output += `- ${emoji} ${status}: ${count}\n`;
      }
    }

    // Template breakdown
    if (Object.keys(stats.byTemplate).length > 0) {
      output += `\n🎨 By Template:\n`;
      const sortedTemplates = Object.entries(stats.byTemplate)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5); // Top 5 templates

      for (const [template, count] of sortedTemplates) {
        output += `- ${template}: ${count}\n`;
      }

      if (Object.keys(stats.byTemplate).length > 5) {
        output += `- ... and ${Object.keys(stats.byTemplate).length - 5} more\n`;
      }
    }

    // Recent servers
    if (servers.length > 0) {
      output += `\n🕒 Recent Servers:\n`;
      const recent = servers
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3);

      for (const server of recent) {
        const emoji = this.getStatusEmoji(server.status);
        const date = this.formatDate(server.createdAt);
        output += `- ${emoji} ${server.name} (${server.template}) - ${date}\n`;
      }
    }

    return output;
  }

  /**
   * Get emoji for server status
   */
  private getStatusEmoji(status: MCPServerStatus): string {
    switch (status) {
      case MCPServerStatus.READY:
        return '✅';
      case MCPServerStatus.BUILDING:
        return '🔨';
      case MCPServerStatus.CREATED:
        return '🆕';
      case MCPServerStatus.ERROR:
        return '❌';
      case MCPServerStatus.ARCHIVED:
        return '📦';
      default:
        return '❓';
    }
  }

  /**
   * Truncate string to specified length
   */
  private truncate(str: string, length: number): string {
    if (str.length <= length) {
      return str;
    }
    return str.substring(0, length - 3) + '...';
  }

  /**
   * Pad string to specified length
   */
  private pad(str: string, length: number): string {
    return str.padEnd(length, ' ');
  }

  /**
   * Format timestamp as relative date
   */
  private formatDate(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return 'just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  }
}