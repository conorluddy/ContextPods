/**
 * Unit tests for Schema Validation
 * Checkpoint 1.4: Schema Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  TemplateLanguageSchema,
  TemplateVariableSchema,
  TemplateFileSchema,
  TemplateMetadataSchema,
  PodConfigSchema,
  MCPToolSchema,
  MCPResourceSchema,
  MCPPromptSchema,
  MCPServerManifestSchema,
  TemplateContextSchema,
  TemplateProcessingResultSchema,
} from '../../src/schemas.js';

describe('Schema Validation', () => {
  /**
   * Test 1: Template Metadata Schema Validation
   */
  describe('Template Metadata Validation', () => {
    it('should validate complete template metadata', () => {
      // Setup: Valid complete template metadata
      const validMetadata = {
        name: 'typescript-advanced',
        description: 'Advanced TypeScript template with TurboRepo optimization',
        version: '1.0.0',
        author: 'Context-Pods Team',
        tags: ['typescript', 'advanced', 'turbo'],
        language: 'typescript',
        optimization: {
          turboRepo: true,
          hotReload: true,
          sharedDependencies: true,
          buildCaching: true,
        },
        variables: {
          serverName: {
            description: 'The name of your MCP server',
            type: 'string',
            required: true,
            validation: {
              pattern: '^[a-z][a-z0-9-]*$',
            },
          },
          port: {
            description: 'Server port number',
            type: 'number',
            required: false,
            default: 3000,
            validation: {
              min: 1000,
              max: 65535,
            },
          },
        },
        files: [
          {
            path: 'package.json.mustache',
            template: true,
          },
          {
            path: 'src/index.ts.mustache',
            template: true,
          },
          {
            path: 'scripts/start.sh',
            template: false,
            executable: true,
          },
        ],
        dependencies: {
          core: ['@modelcontextprotocol/sdk'],
          dev: ['typescript', 'vitest'],
          peer: ['zod'],
        },
        scripts: {
          build: 'tsc',
          test: 'vitest',
          dev: 'tsc --watch',
        },
      };

      // Action: Validate against schema
      const result = TemplateMetadataSchema.safeParse(validMetadata);

      // Assert: Validation passes
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('typescript-advanced');
        expect(result.data.language).toBe('typescript');
        expect(result.data.optimization.turboRepo).toBe(true);
        expect(result.data.variables.serverName.required).toBe(true);
      }
    });

    it('should validate minimal template metadata', () => {
      // Setup: Minimal valid template metadata
      const minimalMetadata = {
        name: 'basic-template',
        description: 'A basic template',
        version: '1.0.0',
        language: 'nodejs',
        optimization: {
          turboRepo: false,
          hotReload: false,
          sharedDependencies: false,
          buildCaching: false,
        },
        variables: {},
        files: [],
      };

      // Action: Validate against schema
      const result = TemplateMetadataSchema.safeParse(minimalMetadata);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should reject invalid template metadata', () => {
      // Setup: Invalid template metadata (missing required fields)
      const invalidMetadata = {
        name: '', // Invalid: empty string
        description: 'Valid description',
        version: '1.0', // Invalid: not semver format
        language: 'invalid-language', // Invalid: not in enum
        optimization: {
          turboRepo: 'yes', // Invalid: should be boolean
          hotReload: true,
          sharedDependencies: true,
          buildCaching: true,
        },
        variables: 'not-an-object', // Invalid: should be object
        files: 'not-an-array', // Invalid: should be array
      };

      // Action: Validate against schema
      const result = TemplateMetadataSchema.safeParse(invalidMetadata);

      // Assert: Validation fails
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues;
        expect(errors.some((e) => e.path.includes('name'))).toBe(true);
        expect(errors.some((e) => e.path.includes('version'))).toBe(true);
        expect(errors.some((e) => e.path.includes('language'))).toBe(true);
        expect(errors.some((e) => e.path.includes('optimization'))).toBe(true);
      }
    });

    it('should validate template language enum values', () => {
      // Setup: Test all valid language values
      const validLanguages = ['nodejs', 'typescript', 'python', 'rust', 'shell'];

      // Action & Assert: All valid languages pass
      validLanguages.forEach((language) => {
        const result = TemplateLanguageSchema.safeParse(language);
        expect(result.success).toBe(true);
      });

      // Setup: Invalid language
      const invalidLanguage = 'cobol';

      // Action: Validate invalid language
      const invalidResult = TemplateLanguageSchema.safeParse(invalidLanguage);

      // Assert: Invalid language fails
      expect(invalidResult.success).toBe(false);
    });

    it('should validate version format strictly', () => {
      // Setup: Valid version formats
      const validVersions = ['1.0.0', '2.15.3', '0.0.1', '10.20.30'];

      // Action & Assert: All valid versions pass
      validVersions.forEach((version) => {
        const metadata = {
          name: 'test',
          description: 'test',
          version,
          language: 'typescript',
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
          files: [],
        };
        const result = TemplateMetadataSchema.safeParse(metadata);
        expect(result.success).toBe(true);
      });

      // Setup: Invalid version formats
      const invalidVersions = ['1.0', '1.0.0-beta', 'v1.0.0', '1.0.0.1', 'latest'];

      // Action & Assert: All invalid versions fail
      invalidVersions.forEach((version) => {
        const metadata = {
          name: 'test',
          description: 'test',
          version,
          language: 'typescript',
          optimization: {
            turboRepo: false,
            hotReload: false,
            sharedDependencies: false,
            buildCaching: false,
          },
          variables: {},
          files: [],
        };
        const result = TemplateMetadataSchema.safeParse(metadata);
        expect(result.success).toBe(false);
      });
    });
  });

  /**
   * Test 2: Variable Definition Schema Validation
   */
  describe('Variable Definition Validation', () => {
    it('should validate string variable with validation rules', () => {
      // Setup: String variable with validation
      const stringVariable = {
        description: 'Server name',
        type: 'string',
        required: true,
        default: 'my-server',
        validation: {
          pattern: '^[a-z][a-z0-9-]*$',
          min: 3,
          max: 50,
        },
      };

      // Action: Validate against schema
      const result = TemplateVariableSchema.safeParse(stringVariable);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate number variable with range validation', () => {
      // Setup: Number variable with range
      const numberVariable = {
        description: 'Port number',
        type: 'number',
        required: false,
        default: 3000,
        validation: {
          min: 1000,
          max: 65535,
        },
      };

      // Action: Validate against schema
      const result = TemplateVariableSchema.safeParse(numberVariable);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate boolean variable', () => {
      // Setup: Simple boolean variable
      const booleanVariable = {
        description: 'Enable debug mode',
        type: 'boolean',
        required: false,
        default: false,
      };

      // Action: Validate against schema
      const result = TemplateVariableSchema.safeParse(booleanVariable);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate array variable with options', () => {
      // Setup: Array variable with predefined options
      const arrayVariable = {
        description: 'Supported databases',
        type: 'array',
        required: true,
        validation: {
          options: ['postgresql', 'mysql', 'sqlite', 'mongodb'],
        },
      };

      // Action: Validate against schema
      const result = TemplateVariableSchema.safeParse(arrayVariable);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should reject invalid variable definitions', () => {
      // Setup: Invalid variable definition
      const invalidVariable = {
        description: '', // Invalid: empty description
        type: 'invalid-type', // Invalid: not in enum
        required: 'yes', // Invalid: should be boolean
        validation: {
          pattern: 123, // Invalid: should be string
          min: 'not-a-number', // Invalid: should be number
        },
      };

      // Action: Validate against schema
      const result = TemplateVariableSchema.safeParse(invalidVariable);

      // Assert: Validation fails
      expect(result.success).toBe(false);
    });
  });

  /**
   * Test 3: File Definition Schema Validation
   */
  describe('File Definition Validation', () => {
    it('should validate template file definition', () => {
      // Setup: Template file with all properties
      const templateFile = {
        path: 'src/server.ts.mustache',
        template: true,
        executable: false,
        encoding: 'utf8',
      };

      // Action: Validate against schema
      const result = TemplateFileSchema.safeParse(templateFile);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate executable file definition', () => {
      // Setup: Executable script file
      const executableFile = {
        path: 'scripts/deploy.sh',
        template: false,
        executable: true,
      };

      // Action: Validate against schema
      const result = TemplateFileSchema.safeParse(executableFile);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate binary file definition', () => {
      // Setup: Binary file
      const binaryFile = {
        path: 'assets/logo.png',
        template: false,
        encoding: 'binary',
      };

      // Action: Validate against schema
      const result = TemplateFileSchema.safeParse(binaryFile);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should reject invalid file definitions', () => {
      // Setup: Invalid file definition
      const invalidFile = {
        path: '', // Invalid: empty path
        template: 'yes', // Invalid: should be boolean
        encoding: 'ascii', // Invalid: not in enum
      };

      // Action: Validate against schema
      const result = TemplateFileSchema.safeParse(invalidFile);

      // Assert: Validation fails
      expect(result.success).toBe(false);
    });
  });

  /**
   * Test 4: MCP Schema Validation
   */
  describe('MCP Schema Validation', () => {
    it('should validate MCP tool definition', () => {
      // Setup: Valid MCP tool
      const mcpTool = {
        name: 'create-file',
        description: 'Create a new file with content',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['path', 'content'],
        },
      };

      // Action: Validate against schema
      const result = MCPToolSchema.safeParse(mcpTool);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate MCP resource definition', () => {
      // Setup: Valid MCP resource
      const mcpResource = {
        uri: 'file:///templates',
        name: 'Available Templates',
        description: 'List of all available MCP server templates',
        mimeType: 'application/json',
      };

      // Action: Validate against schema
      const result = MCPResourceSchema.safeParse(mcpResource);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate MCP prompt definition', () => {
      // Setup: Valid MCP prompt
      const mcpPrompt = {
        name: 'generate-server',
        description: 'Generate a new MCP server from template',
        arguments: [
          {
            name: 'template',
            description: 'Template name to use',
            required: true,
          },
          {
            name: 'name',
            description: 'Server name',
            required: true,
          },
          {
            name: 'description',
            description: 'Server description',
            required: false,
          },
        ],
      };

      // Action: Validate against schema
      const result = MCPPromptSchema.safeParse(mcpPrompt);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate complete MCP server manifest', () => {
      // Setup: Complete MCP server manifest
      const mcpManifest = {
        name: 'context-pods-server',
        version: '1.0.0',
        description: 'Context-Pods MCP server for template management',
        tools: [
          {
            name: 'create-mcp',
            description: 'Create a new MCP server',
            inputSchema: {
              type: 'object',
              properties: {
                template: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        ],
        resources: [
          {
            uri: 'context-pods://templates',
            name: 'Templates',
          },
        ],
        prompts: [
          {
            name: 'generate',
            description: 'Generate server prompt',
          },
        ],
      };

      // Action: Validate against schema
      const result = MCPServerManifestSchema.safeParse(mcpManifest);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });
  });

  /**
   * Test 5: Pod Configuration and Processing Schema Validation
   */
  describe('Pod Configuration and Processing Validation', () => {
    it('should validate pod configuration', () => {
      // Setup: Valid pod configuration
      const podConfig = {
        name: 'my-test-server',
        description: 'A test MCP server',
        template: 'typescript-advanced',
        outputPath: '/generated/my-test-server',
        variables: {
          serverName: 'my-test-server',
          port: 3000,
          enableAuth: true,
        },
      };

      // Action: Validate against schema
      const result = PodConfigSchema.safeParse(podConfig);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate template context', () => {
      // Setup: Valid template context
      const templateContext = {
        variables: {
          serverName: 'test-server',
          description: 'Test MCP server',
        },
        outputPath: '/generated/test-server',
        templatePath: '/templates/typescript-advanced',
        optimization: {
          turboRepo: true,
          hotReload: true,
          sharedDependencies: true,
          buildCaching: true,
        },
      };

      // Action: Validate against schema
      const result = TemplateContextSchema.safeParse(templateContext);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate template processing result', () => {
      // Setup: Valid processing result
      const processingResult = {
        success: true,
        outputPath: '/generated/test-server',
        generatedFiles: [
          '/generated/test-server/package.json',
          '/generated/test-server/src/index.ts',
          '/generated/test-server/tsconfig.json',
        ],
        warnings: ['Template uses deprecated variable syntax'],
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
      };

      // Action: Validate against schema
      const result = TemplateProcessingResultSchema.safeParse(processingResult);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should validate failed processing result', () => {
      // Setup: Failed processing result
      const failedResult = {
        success: false,
        outputPath: '/generated/test-server',
        generatedFiles: [],
        errors: ['Template not found: invalid-template', 'Required variable missing: serverName'],
        warnings: [],
      };

      // Action: Validate against schema
      const result = TemplateProcessingResultSchema.safeParse(failedResult);

      // Assert: Validation passes
      expect(result.success).toBe(true);
    });

    it('should reject invalid pod configuration', () => {
      // Setup: Invalid pod configuration
      const invalidConfig = {
        name: 'Invalid Name With Spaces', // Invalid: contains spaces/capitals
        description: '', // Invalid: empty description
        template: '', // Invalid: empty template
        variables: 'not-an-object', // Invalid: should be object
      };

      // Action: Validate against schema
      const result = PodConfigSchema.safeParse(invalidConfig);

      // Assert: Validation fails
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues;
        expect(errors.some((e) => e.path.includes('name'))).toBe(true);
        expect(errors.some((e) => e.path.includes('description'))).toBe(true);
        expect(errors.some((e) => e.path.includes('template'))).toBe(true);
      }
    });
  });
});
