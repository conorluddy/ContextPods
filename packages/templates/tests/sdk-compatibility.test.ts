/**
 * SDK 1.17.4 Compatibility Tests for MCP Templates
 *
 * Validates that all TypeScript templates are compatible with the latest
 * @modelcontextprotocol/sdk version and use correct import patterns
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

import { getAvailableTemplates } from '../src/index.js';

describe('SDK 1.17.4 Compatibility', () => {
  const typeScriptTemplates = getAvailableTemplates().filter((t) => t.language === 'typescript');

  describe('Package.json SDK Dependencies', () => {
    typeScriptTemplates.forEach((template) => {
      it(`${template.name} should use SDK version 1.17.4 or higher`, () => {
        const packageJsonPath = join(template.path, 'package.json');
        expect(existsSync(packageJsonPath)).toBe(true);

        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const sdkVersion = packageJson.dependencies?.['@modelcontextprotocol/sdk'];

        expect(sdkVersion).toBeDefined();
        expect(sdkVersion).toMatch(/^\^1\.17\.\d+$/);

        // Extract version number and ensure it's >= 1.17.4
        const versionMatch = sdkVersion.match(/\^1\.17\.(\d+)/);
        if (versionMatch) {
          const minorVersion = parseInt(versionMatch[1], 10);
          expect(minorVersion).toBeGreaterThanOrEqual(4);
        }
      });
    });
  });

  describe('Import Path Patterns', () => {
    typeScriptTemplates.forEach((template) => {
      describe(`${template.name} template imports`, () => {
        it('should use correct Server import path with .js extension', () => {
          const sourceFiles = findTypeScriptFiles(template.path);

          sourceFiles.forEach((file) => {
            const content = readFileSync(file, 'utf-8');
            // Only check files that actually import Server from the SDK
            if (content.includes("from '@modelcontextprotocol/sdk/server")) {
              expect(content).toMatch(
                /import\s+.*Server.*\s+from\s+['"]@modelcontextprotocol\/sdk\/server\/index\.js['"]/,
              );
            }
          });
        });

        it('should use correct StdioServerTransport import path', () => {
          const sourceFiles = findTypeScriptFiles(template.path);

          sourceFiles.forEach((file) => {
            const content = readFileSync(file, 'utf-8');
            if (content.includes('StdioServerTransport')) {
              expect(content).toMatch(
                /import\s+.*StdioServerTransport.*\s+from\s+['"]@modelcontextprotocol\/sdk\/server\/stdio\.js['"]/,
              );
            }
          });
        });

        it('should use correct types import path', () => {
          const sourceFiles = findTypeScriptFiles(template.path);
          let hasTypesImport = false;

          sourceFiles.forEach((file) => {
            const content = readFileSync(file, 'utf-8');
            // Check if file imports from SDK types
            if (content.includes('@modelcontextprotocol/sdk/types')) {
              hasTypesImport = true;
              // Verify it has the .js extension
              expect(content).toMatch(/@modelcontextprotocol\/sdk\/types\.js/);
            }
          });

          // At least one file should import from types
          expect(hasTypesImport).toBe(true);
        });

        it('should not import from deprecated SDK paths', () => {
          const sourceFiles = findTypeScriptFiles(template.path);

          sourceFiles.forEach((file) => {
            const content = readFileSync(file, 'utf-8');
            const importLines = content
              .split('\n')
              .filter(
                (line) => line.includes('import') && line.includes('@modelcontextprotocol/sdk'),
              );

            importLines.forEach((line) => {
              // Check that we're using proper subpaths
              expect(line).toMatch(/\/sdk\/(server|types)/);
              // Check for .js extension
              expect(line).toMatch(/\.js['"]/);
            });
          });
        });
      });
    });
  });

  describe('TypeScript Configuration', () => {
    typeScriptTemplates.forEach((template) => {
      it(`${template.name} should have proper ESM TypeScript configuration`, () => {
        const tsconfigPath = join(template.path, 'tsconfig.json');
        if (existsSync(tsconfigPath)) {
          const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

          // Check for ESM module settings - Node16 is correct for modern Node.js ESM
          expect(tsconfig.compilerOptions?.module).toMatch(
            /^(ES2020|ES2022|ESNext|NodeNext|Node16)$/i,
          );
          expect(tsconfig.compilerOptions?.moduleResolution).toMatch(
            /^(node|NodeNext|bundler|Node16)$/i,
          );

          // Check for proper target
          const target = tsconfig.compilerOptions?.target;
          expect(
            ['ES2020', 'ES2021', 'ES2022', 'ESNext'].some((t) => target?.toUpperCase() === t),
          ).toBe(true);
        }
      });
    });
  });

  describe('Core MCP Features Usage', () => {
    typeScriptTemplates.forEach((template) => {
      describe(`${template.name} template MCP implementation`, () => {
        it('should properly instantiate Server with correct constructor', () => {
          const sourceFiles = findTypeScriptFiles(template.path);

          sourceFiles.forEach((file) => {
            const content = readFileSync(file, 'utf-8');
            if (content.includes('new Server')) {
              // Check for proper Server instantiation pattern
              expect(content).toMatch(/new Server\s*\(\s*\{[\s\S]*?name:[\s\S]*?version:/);
            }
          });
        });

        it('should use setRequestHandler for protocol handlers', () => {
          const sourceFiles = findTypeScriptFiles(template.path);

          sourceFiles.forEach((file) => {
            const content = readFileSync(file, 'utf-8');
            if (content.includes('server.')) {
              // Check for proper handler registration
              const handlerPatterns = [
                'ListToolsRequestSchema',
                'CallToolRequestSchema',
                'ListResourcesRequestSchema',
                'ReadResourceRequestSchema',
              ];

              handlerPatterns.forEach((pattern) => {
                if (content.includes(pattern)) {
                  expect(content).toMatch(
                    new RegExp(`server\\.setRequestHandler\\s*\\(\\s*${pattern}`),
                  );
                }
              });
            }
          });
        });

        it('should properly connect to StdioServerTransport', () => {
          const sourceFiles = findTypeScriptFiles(template.path);

          sourceFiles.forEach((file) => {
            const content = readFileSync(file, 'utf-8');
            if (content.includes('StdioServerTransport')) {
              expect(content).toMatch(/new StdioServerTransport\s*\(\s*\)/);
              expect(content).toMatch(/server\.connect\s*\(\s*transport/);
            }
          });
        });
      });
    });
  });

  describe('No Usage of Deprecated APIs', () => {
    typeScriptTemplates.forEach((template) => {
      it(`${template.name} should not use deprecated SDK 0.5.0 patterns`, () => {
        const sourceFiles = findTypeScriptFiles(template.path);
        const deprecatedPatterns = [
          /McpServer/, // Old class name
          /createServer.*from.*sdk/, // Old factory pattern
          /\.handle\(/, // Old handler method
          /\.onRequest\(/, // Old request handler
          /import.*\{.*Server.*\}.*from.*['"]@modelcontextprotocol\/sdk['"]/, // Old import
        ];

        sourceFiles.forEach((file) => {
          const content = readFileSync(file, 'utf-8');
          deprecatedPatterns.forEach((pattern) => {
            expect(content).not.toMatch(pattern);
          });
        });
      });
    });
  });
});

/**
 * Helper function to find all TypeScript source files in a template
 */
function findTypeScriptFiles(templatePath: string): string[] {
  const files: string[] = [];
  const srcPath = join(templatePath, 'src');

  if (!existsSync(srcPath)) {
    return files;
  }

  function scanDirectory(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }

  scanDirectory(srcPath);
  return files;
}
