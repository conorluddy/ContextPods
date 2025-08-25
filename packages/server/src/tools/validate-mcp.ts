/**
 * Validate MCP server tool
 */

import { promises as fs } from 'fs';
import { join } from 'path';

import { getRegistryOperations } from '../registry/index.js';

import { BaseTool, type ToolResult } from './base-tool.js';

/**
 * Arguments for validate-mcp tool
 */
interface ValidateMCPArgs extends Record<string, unknown> {
  mcpPath: string;
  checkRegistry?: boolean;
  checkSchema?: boolean;
  checkBuild?: boolean;
}

/**
 * Validation result interface
 */
interface ValidationResult {
  path: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    name?: string;
    version?: string;
    language?: string;
    hasPackageJson?: boolean;
    hasMainFile?: boolean;
    hasBuildScript?: boolean;
    inRegistry?: boolean;
    registryStatus?: string;
  };
}

/**
 * Validate MCP server tool implementation
 */
export class ValidateMCPTool extends BaseTool {
  constructor() {
    super('validate-mcp');
  }

  /**
   * Validate validate-mcp arguments
   */
  protected async validateArguments(args: unknown): Promise<string | null> {
    const typedArgs = args as ValidateMCPArgs;

    // Validate required arguments
    const error = this.validateStringArgument(typedArgs, 'mcpPath', true, 1);
    if (error) return error;

    // Check if path exists
    try {
      const stat = await fs.stat(typedArgs.mcpPath);
      if (!stat.isDirectory()) {
        return 'MCP path must point to a directory';
      }
    } catch {
      return `MCP directory not found: ${typedArgs.mcpPath}`;
    }

    return null;
  }

  /**
   * Execute validate-mcp tool
   */
  protected async execute(args: unknown): Promise<ToolResult> {
    const typedArgs = args as ValidateMCPArgs;

    try {
      // Run all validations
      const result = await this.validateMCPServer(typedArgs);

      // Format output
      const output = this.formatValidationResult(result);

      return {
        success: result.valid,
        data: output,
        warnings: result.valid ? result.warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate MCP server
   */
  private async validateMCPServer(args: ValidateMCPArgs): Promise<ValidationResult> {
    const result: ValidationResult = {
      path: args.mcpPath,
      valid: true,
      errors: [],
      warnings: [],
      info: {},
    };

    try {
      // Step 1: Check basic structure
      await this.validateBasicStructure(args.mcpPath, result);

      // Step 2: Check package.json if it exists
      await this.validatePackageJson(args.mcpPath, result);

      // Step 3: Check main file
      await this.validateMainFile(args.mcpPath, result);

      // Step 4: Check registry status if requested
      if (args.checkRegistry !== false) {
        await this.validateRegistryStatus(args.mcpPath, result);
      }

      // Step 5: Check MCP schema compliance if requested
      if (args.checkSchema !== false) {
        await this.validateMCPSchema(args.mcpPath, result);
      }

      // Step 6: Check build if requested
      if (args.checkBuild === true) {
        await this.validateBuild(args.mcpPath, result);
      }

      // Determine overall validity
      result.valid = result.errors.length === 0;
    } catch (error) {
      result.valid = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Validate basic MCP server structure
   */
  private async validateBasicStructure(mcpPath: string, result: ValidationResult): Promise<void> {
    try {
      const files = await fs.readdir(mcpPath);

      // Check for package.json (Node.js/TypeScript projects)
      result.info.hasPackageJson = files.includes('package.json');

      // Check for main entry files
      const mainFiles = ['index.js', 'index.ts', 'main.py', 'src/index.ts', 'src/index.js'];
      result.info.hasMainFile = mainFiles.some(
        (file) => files.includes(file) || files.includes('src'),
      );

      if (!result.info.hasPackageJson && !result.info.hasMainFile) {
        result.errors.push(
          'No recognizable MCP server structure found (missing package.json or main entry file)',
        );
      }

      // Check for common directories
      const hasSourceDir = files.includes('src');
      const hasDistDir = files.includes('dist');

      if (result.info.hasPackageJson && !hasSourceDir) {
        result.warnings.push('No "src" directory found - consider organizing source code in src/');
      }

      if (result.info.hasPackageJson && hasSourceDir && !hasDistDir) {
        result.warnings.push('No "dist" directory found - may need to build the project');
      }
    } catch (error) {
      result.errors.push(
        `Failed to read directory structure: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate package.json
   */
  private async validatePackageJson(mcpPath: string, result: ValidationResult): Promise<void> {
    if (!result.info.hasPackageJson) {
      return;
    }

    try {
      const packageJsonPath = join(mcpPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);

      result.info.name = packageJson.name;
      result.info.version = packageJson.version;

      // Check required fields
      if (!packageJson.name) {
        result.errors.push('package.json is missing "name" field');
      }

      if (!packageJson.version) {
        result.errors.push('package.json is missing "version" field');
      }

      if (!packageJson.main && !packageJson.module && !packageJson.exports) {
        result.errors.push('package.json is missing entry point (main, module, or exports)');
      }

      // Check for MCP SDK dependency
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      if (!deps['@modelcontextprotocol/sdk']) {
        result.errors.push('Missing dependency: @modelcontextprotocol/sdk');
      }

      // Check for build script
      result.info.hasBuildScript = packageJson.scripts?.build;

      if (result.info.hasBuildScript) {
        result.info.language = this.detectLanguageFromPackageJson(packageJson);
      } else {
        result.warnings.push('No build script found in package.json');
      }

      // Check for proper type field for ES modules
      if (packageJson.type !== 'module' && packageJson.type !== 'commonjs') {
        result.warnings.push(
          'Consider setting "type" field in package.json ("module" or "commonjs")',
        );
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        result.errors.push('package.json contains invalid JSON');
      } else {
        result.errors.push(
          `Failed to validate package.json: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Validate main file
   */
  private async validateMainFile(mcpPath: string, result: ValidationResult): Promise<void> {
    const possibleMainFiles = [
      'index.js',
      'index.ts',
      'src/index.ts',
      'src/index.js',
      'main.py',
      'src/main.py',
    ];

    let mainFileFound = false;

    for (const file of possibleMainFiles) {
      try {
        const filePath = join(mcpPath, file);
        await fs.access(filePath);

        mainFileFound = true;

        // Check file content for MCP patterns
        await this.validateMainFileContent(filePath, result);
        break;
      } catch {
        // File doesn't exist, continue
      }
    }

    if (!mainFileFound) {
      result.errors.push('No main entry file found');
    }
  }

  /**
   * Validate main file content
   */
  private async validateMainFileContent(filePath: string, result: ValidationResult): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');

      // Check for MCP SDK imports
      const hasMCPImport =
        content.includes('@modelcontextprotocol/sdk') || content.includes('from mcp');

      if (!hasMCPImport) {
        result.errors.push('Main file does not import MCP SDK');
      }

      // Check for MCP server patterns
      const hasServerPattern =
        content.includes('new Server(') ||
        content.includes('Server(') ||
        content.includes('create_server(') ||
        content.includes('MCPServer');

      if (!hasServerPattern) {
        result.errors.push('Main file does not appear to create an MCP server');
      }

      // Check for transport setup
      const hasTransport =
        content.includes('Transport') || content.includes('stdio') || content.includes('connect');

      if (!hasTransport) {
        result.warnings.push('Main file may be missing transport setup');
      }

      // Check for request handlers
      const hasHandlers =
        content.includes('setRequestHandler') ||
        content.includes('handler') ||
        content.includes('tools') ||
        content.includes('resources');

      if (!hasHandlers) {
        result.warnings.push('Main file may be missing request handlers');
      }
    } catch (error) {
      result.errors.push(
        `Failed to validate main file content: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate registry status
   */
  private async validateRegistryStatus(mcpPath: string, result: ValidationResult): Promise<void> {
    try {
      const registry = await getRegistryOperations();
      const servers = await registry.listServers();

      // Find server by path
      const server = servers.find((s) => s.path === mcpPath);

      result.info.inRegistry = !!server;

      if (server) {
        result.info.registryStatus = server.status;

        if (server.status === 'error') {
          result.warnings.push(
            `Server is registered but has error status: ${server.metadata.errorMessage || 'Unknown error'}`,
          );
        }
      } else {
        result.warnings.push('Server is not registered in Context-Pods registry');
      }
    } catch (error) {
      result.warnings.push(
        `Failed to check registry status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate MCP schema compliance
   */
  private async validateMCPSchema(mcpPath: string, result: ValidationResult): Promise<void> {
    // This would ideally run the MCP server and check its responses
    // For now, we'll do basic static analysis

    try {
      // Check if server can be imported/required (basic syntax check)
      const mainFiles = ['index.js', 'src/index.js', 'dist/index.js'];

      for (const file of mainFiles) {
        try {
          const filePath = join(mcpPath, file);
          await fs.access(filePath);

          // Read and check for syntax errors
          const content = await fs.readFile(filePath, 'utf8');

          // Basic checks for MCP protocol compliance
          if (!content.includes('ListToolsRequestSchema') && !content.includes('tools')) {
            result.warnings.push('Server may not implement tools properly');
          }

          if (!content.includes('ListResourcesRequestSchema') && !content.includes('resources')) {
            result.warnings.push('Server may not implement resources properly');
          }

          break;
        } catch {
          continue;
        }
      }
    } catch (error) {
      result.warnings.push(
        `Schema validation incomplete: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate build process
   */
  private async validateBuild(mcpPath: string, result: ValidationResult): Promise<void> {
    if (!result.info.hasBuildScript) {
      result.warnings.push('Cannot validate build - no build script found');
      return;
    }

    try {
      // This would ideally run the build command
      // For now, just check if dist directory exists or is created
      const distPath = join(mcpPath, 'dist');

      try {
        await fs.access(distPath);
        result.info.hasMainFile = true;
      } catch {
        result.warnings.push('Build validation skipped - would require running build command');
      }
    } catch (error) {
      result.warnings.push(
        `Build validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Detect language from package.json
   */
  private detectLanguageFromPackageJson(packageJson: any): string {
    // Check dependencies
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (deps.typescript || packageJson.scripts?.build?.includes('tsc')) {
      return 'typescript';
    }

    if (deps.python || packageJson.scripts?.build?.includes('python')) {
      return 'python';
    }

    return 'javascript';
  }

  /**
   * Format validation result
   */
  private formatValidationResult(result: ValidationResult): string {
    let output = `🔍 MCP Server Validation: ${result.path}\n\n`;

    // Overall status
    if (result.valid) {
      output += `✅ Validation Status: VALID\n\n`;
    } else {
      output += `❌ Validation Status: INVALID\n\n`;
    }

    // Server information
    if (Object.keys(result.info).length > 0) {
      output += `📋 Server Information:\n`;

      if (result.info.name) {
        output += `- Name: ${result.info.name}\n`;
      }

      if (result.info.version) {
        output += `- Version: ${result.info.version}\n`;
      }

      if (result.info.language) {
        output += `- Language: ${result.info.language}\n`;
      }

      output += `- Has package.json: ${result.info.hasPackageJson ? 'Yes' : 'No'}\n`;
      output += `- Has main file: ${result.info.hasMainFile ? 'Yes' : 'No'}\n`;
      output += `- Has build script: ${result.info.hasBuildScript ? 'Yes' : 'No'}\n`;

      if (result.info.inRegistry !== undefined) {
        output += `- In registry: ${result.info.inRegistry ? 'Yes' : 'No'}\n`;

        if (result.info.registryStatus) {
          output += `- Registry status: ${result.info.registryStatus}\n`;
        }
      }

      output += `\n`;
    }

    // Errors
    if (result.errors.length > 0) {
      output += `❌ Errors (${result.errors.length}):\n`;
      for (const error of result.errors) {
        output += `- ${error}\n`;
      }
      output += `\n`;
    }

    // Warnings
    if (result.warnings.length > 0) {
      output += `⚠️ Warnings (${result.warnings.length}):\n`;
      for (const warning of result.warnings) {
        output += `- ${warning}\n`;
      }
      output += `\n`;
    }

    // Recommendations
    if (!result.valid) {
      output += `💡 Recommendations:\n`;
      output += `- Fix the errors listed above\n`;
      output += `- Ensure the server follows MCP protocol specifications\n`;
      output += `- Test the server with an MCP client\n`;
      output += `- Run validation again after making changes\n`;
    } else if (result.warnings.length > 0) {
      output += `💡 Recommendations:\n`;
      output += `- Address the warnings to improve server quality\n`;
      output += `- Consider adding missing optional features\n`;
    } else {
      output += `🎉 Great! Your MCP server passes all validation checks.`;
    }

    return output;
  }
}
