/**
 * Base tool class with error handling
 */

import { logger } from '@context-pods/core';

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  warnings?: string[];
}

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP tool response content - matches CallToolResult from MCP SDK
 */
export type MCPToolResponse = CallToolResult;

/**
 * Base tool class with common functionality
 */
export abstract class BaseTool {
  protected toolName: string;

  constructor(toolName: string) {
    this.toolName = toolName;
  }

  /**
   * Execute the tool with error boundary
   */
  async safeExecute(args: unknown): Promise<MCPToolResponse> {
    const startTime = Date.now();
    
    try {
      logger.info(`Executing tool: ${this.toolName}`, { args });

      // Validate arguments
      const validationError = await this.validateArguments(args);
      if (validationError) {
        return this.createErrorResponse(`Invalid arguments: ${validationError}`);
      }

      // Execute the tool
      const result = await this.execute(args);

      // Format successful response
      const response = this.formatResponse(result);
      
      const duration = Date.now() - startTime;
      logger.info(`Tool executed successfully: ${this.toolName}`, { duration });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`Tool execution failed: ${this.toolName}`, {
        error: errorMessage,
        duration,
        args,
      });

      return this.createErrorResponse(errorMessage);
    }
  }

  /**
   * Abstract method for tool implementation
   */
  protected abstract execute(args: unknown): Promise<ToolResult>;

  /**
   * Validate tool arguments
   */
  protected validateArguments(_args: unknown): Promise<string | null> {
    // Default implementation - no validation
    // Override in subclasses for specific validation
    return Promise.resolve(null);
  }

  /**
   * Format successful tool response
   */
  protected formatResponse(result: ToolResult): MCPToolResponse {
    if (!result.success) {
      return this.createErrorResponse(result.error || 'Tool execution failed');
    }

    let text = '';

    // Add success message
    if (result.data) {
      if (typeof result.data === 'string') {
        text = result.data;
      } else {
        text = JSON.stringify(result.data, null, 2);
      }
    } else {
      text = `✅ ${this.toolName} completed successfully`;
    }

    // Add warnings if any
    if (result.warnings && result.warnings.length > 0) {
      text += '\n\n⚠️ Warnings:\n' + result.warnings.map(w => `- ${w}`).join('\n');
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  /**
   * Create error response
   */
  protected createErrorResponse(error: string): MCPToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error in ${this.toolName}: ${error}`,
        },
      ],
    };
  }

  /**
   * Create success response with custom text
   */
  protected createSuccessResponse(text: string): MCPToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: `✅ ${text}`,
        },
      ],
    };
  }

  /**
   * Create info response
   */
  protected createInfoResponse(text: string): MCPToolResponse {
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  /**
   * Helper to check if argument exists and is of correct type
   */
  protected validateArgument(
    args: Record<string, unknown>,
    name: string,
    type: 'string' | 'number' | 'boolean' | 'object',
    required = true
  ): string | null {
    if (required && (args[name] === undefined || args[name] === null)) {
      return `Missing required argument: ${name}`;
    }

    if (args[name] !== undefined && args[name] !== null) {
      const actualType = Array.isArray(args[name]) ? 'array' : typeof args[name];
      
      if (type === 'object' && actualType !== 'object') {
        return `Argument '${name}' must be an object, got ${actualType}`;
      } else if (type !== 'object' && actualType !== type) {
        return `Argument '${name}' must be a ${type}, got ${actualType}`;
      }
    }

    return null;
  }

  /**
   * Helper to validate string argument with additional checks
   */
  protected validateStringArgument(
    args: Record<string, unknown>,
    name: string,
    required = true,
    minLength = 0,
    maxLength = Infinity
  ): string | null {
    const typeError = this.validateArgument(args, name, 'string', required);
    if (typeError) return typeError;

    if (args[name] !== undefined && args[name] !== null) {
      const value = String(args[name]);
      
      if (value.length < minLength) {
        return `Argument '${name}' must be at least ${minLength} characters long`;
      }
      
      if (value.length > maxLength) {
        return `Argument '${name}' must be at most ${maxLength} characters long`;
      }
    }

    return null;
  }
}