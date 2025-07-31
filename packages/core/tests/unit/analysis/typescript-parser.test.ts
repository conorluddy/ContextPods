import { describe, it, expect, beforeEach } from 'vitest';

import { TypeScriptParser } from '../../../src/analysis/parsers/typescript-parser.js';
import { TemplateLanguage } from '../../../src/types.js';

// eslint-disable-next-line max-lines-per-function
describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;

  beforeEach(() => {
    parser = new TypeScriptParser();
  });

  describe('constructor', () => {
    it('should initialize with TypeScript language by default', () => {
      expect(parser['language']).toBe(TemplateLanguage.TYPESCRIPT);
    });

    it('should accept custom language', () => {
      const jsParser = new TypeScriptParser(TemplateLanguage.NODEJS);
      expect(jsParser['language']).toBe(TemplateLanguage.NODEJS);
    });
  });

  // eslint-disable-next-line max-lines-per-function
  describe('parseFile', () => {
    it('should parse function declarations', async () => {
      const content = `
        export function calculateSum(a: number, b: number): number {
          return a + b;
        }
      `;

      const functions = await parser.parseFile('/test.ts', content);

      expect(functions).toHaveLength(1);
      expect(functions[0]).toMatchObject({
        name: 'calculateSum',
        isExported: true,
        isAsync: false,
        parameters: [
          { name: 'a', type: 'number', optional: false },
          { name: 'b', type: 'number', optional: false },
        ],
        returnType: 'number',
      });
    });

    it('should parse async function declarations', async () => {
      const content = `
        export async function fetchData(url: string): Promise<any> {
          const response = await fetch(url);
          return response.json();
        }
      `;

      const functions = await parser.parseFile('/test.ts', content);

      expect(functions).toHaveLength(1);
      expect(functions[0]).toMatchObject({
        name: 'fetchData',
        isExported: true,
        isAsync: true,
        returnType: 'Promise<any>',
      });
    });

    it('should parse arrow functions', async () => {
      const content = `
        const processData = async (data: string[]): Promise<string> => {
          return data.join(', ');
        };
      `;

      const functions = await parser.parseFile('/test.ts', content);

      expect(functions).toHaveLength(1);
      expect(functions[0]).toMatchObject({
        name: 'processData',
        isAsync: true,
        parameters: [{ name: 'data', type: 'string[]', optional: false }],
      });
    });

    it('should parse class methods', async () => {
      const content = `
        class UserService {
          /**
           * Gets user by ID
           */
          public async getUser(id: string): Promise<User> {
            return this.database.findUser(id);
          }

          private validateId(id: string): boolean {
            return id.length > 0;
          }
        }
      `;

      const functions = await parser.parseFile('/test.ts', content);

      expect(functions).toHaveLength(2);

      const publicMethod = functions.find((f) => f.name === 'getUser');
      expect(publicMethod).toMatchObject({
        name: 'getUser',
        isExported: true, // Public methods are considered exported
        isAsync: true,
        parameters: [{ name: 'id', type: 'string', optional: false }],
        returnType: 'Promise<User>',
      });

      const privateMethod = functions.find((f) => f.name === 'validateId');
      expect(privateMethod).toMatchObject({
        name: 'validateId',
        isExported: false,
        isAsync: false,
      });
    });

    it('should extract JSDoc documentation', async () => {
      const content = `
        /**
         * Calculates the factorial of a number
         * @param n The number to calculate factorial for
         * @returns The factorial result
         */
        export function factorial(n: number): number {
          if (n <= 1) return 1;
          return n * factorial(n - 1);
        }
      `;

      const functions = await parser.parseFile('/test.ts', content);

      expect(functions).toHaveLength(1);
      expect(functions[0].documentation).toContain('Calculates the factorial');
      expect(functions[0].documentation).toContain('@param n');
      expect(functions[0].documentation).toContain('@returns');
    });

    it('should handle optional parameters', async () => {
      const content = `
        function greet(name: string, greeting?: string, enthusiastic = false): string {
          const msg = greeting || 'Hello';
          return enthusiastic ? \`\${msg}, \${name}!\` : \`\${msg}, \${name}\`;
        }
      `;

      const functions = await parser.parseFile('/test.ts', content);

      expect(functions).toHaveLength(1);
      expect(functions[0].parameters).toEqual([
        { name: 'name', type: 'string', optional: false, defaultValue: undefined },
        { name: 'greeting', type: 'string', optional: true, defaultValue: undefined },
        { name: 'enthusiastic', type: undefined, optional: false, defaultValue: 'false' },
      ]);
    });

    it('should calculate complexity metrics', async () => {
      const content = `
        export function complexFunction(data: any[]): any {
          if (!data || data.length === 0) {
            return null;
          }
          
          const result = [];
          for (const item of data) {
            if (item.type === 'valid') {
              try {
                const processed = processItem(item);
                if (processed) {
                  result.push(processed);
                }
              } catch (error) {
                console.error('Error processing item:', error);
              }
            }
          }
          
          return result.length > 0 ? result : null;
        }
      `;

      const functions = await parser.parseFile('/test.ts', content);

      expect(functions).toHaveLength(1);
      expect(functions[0].complexity.cyclomaticComplexity).toBeGreaterThan(1);
      expect(functions[0].complexity.linesOfCode).toBeGreaterThan(10);
    });

    it('should handle files with syntax errors gracefully', async () => {
      const content = `
        export function incomplete(param: string {
          return param.toUpperCase(
        }
      `;

      const functions = await parser.parseFile('/test.ts', content);

      // TypeScript parser might still extract some incomplete function info
      // The important thing is it doesn't throw an error
      expect(Array.isArray(functions)).toBe(true);
    });

    it('should handle empty files', async () => {
      const functions = await parser.parseFile('/empty.ts', '');

      expect(functions).toEqual([]);
    });

    it('should extract function location information', async () => {
      const content = `
        // Line 1
        // Line 2
        export function testFunction(): void {
          // Function body
          console.log('test');
        }
      `;

      const functions = await parser.parseFile('/test.ts', content);

      expect(functions).toHaveLength(1);
      expect(functions[0].location).toMatchObject({
        filePath: '/test.ts',
        startLine: expect.any(Number),
        endLine: expect.any(Number),
      });
      expect(functions[0].location.endLine).toBeGreaterThan(functions[0].location.startLine);
    });
  });

  describe('detectPatterns', () => {
    it('should detect API call patterns', async () => {
      const content = `
        async function fetchUserData() {
          const response = await fetch('/api/users');
          const data = await axios.get('/api/data');
          return response.json();
        }
      `;

      const patterns = await parser.detectPatterns(content, []);

      const apiPattern = patterns.find((p) => p.type === 'api-call');
      expect(apiPattern).toBeDefined();
      expect(apiPattern?.confidence).toBeGreaterThan(0);
      expect(apiPattern?.evidence).toContain('fetch(');
    });

    it('should detect file operation patterns', async () => {
      const content = `
        import fs from 'fs';
        import path from 'path';
        
        async function processFile(filename: string) {
          const filePath = path.join(__dirname, filename);
          const content = await fs.readFile(filePath, 'utf-8');
          const stats = await fs.stat(filePath);
          return { content, size: stats.size };
        }
      `;

      const patterns = await parser.detectPatterns(content, []);

      const filePattern = patterns.find((p) => p.type === 'file-operation');
      expect(filePattern).toBeDefined();
      expect(filePattern?.confidence).toBeGreaterThan(0);
      expect(filePattern?.evidence.some((e) => e.includes('fs.'))).toBe(true);
    });

    it('should detect database query patterns', async () => {
      const content = `
        import { prisma } from './db';
        
        async function getUsers() {
          const users = await prisma.user.findMany();
          const result = await db.query('SELECT * FROM users WHERE active = ?', [true]);
          return users;
        }
      `;

      const patterns = await parser.detectPatterns(content, []);

      const dbPattern = patterns.find((p) => p.type === 'database-query');
      expect(dbPattern).toBeDefined();
      expect(dbPattern?.confidence).toBeGreaterThan(0);
    });

    it('should detect validation patterns', async () => {
      const content = `
        import { z } from 'zod';
        import Joi from 'joi';
        
        const userSchema = z.object({
          name: z.string(),
          email: z.string().email(),
        });
        
        function validateUser(data: any) {
          return userSchema.parse(data);
        }
        
        function checkValid(input: any) {
          return schema.validate(input);
        }
      `;

      const patterns = await parser.detectPatterns(content, []);

      const validationPattern = patterns.find((p) => p.type === 'validation-logic');
      expect(validationPattern).toBeDefined();
      expect(validationPattern?.confidence).toBeGreaterThan(0);
    });

    it('should detect external dependencies', async () => {
      const content = `
        import axios from 'axios';
        import { v4 as uuid } from 'uuid';
        import lodash from 'lodash';
        import fs from 'fs'; // Node.js built-in
        import './local-file'; // Local import
      `;

      const patterns = await parser.detectPatterns(content, []);

      const depPattern = patterns.find((p) => p.type === 'external-dependency');
      expect(depPattern).toBeDefined();
      expect(depPattern?.evidence).toContain("import axios from 'axios'");
      expect(depPattern?.evidence).toContain("import { v4 as uuid } from 'uuid'");
      expect(depPattern?.evidence).toContain("import lodash from 'lodash'");
      // Should not include built-ins or local imports
      expect(depPattern?.evidence.some((e) => e.includes('node:'))).toBe(false);
      expect(depPattern?.evidence.some((e) => e.includes('./local-file'))).toBe(false);
    });

    it('should handle multiple patterns in the same content', async () => {
      const content = `
        import axios from 'axios';
        import fs from 'fs';
        import { z } from 'zod';
        
        const schema = z.string();
        
        async function processApiData(url: string) {
          const response = await axios.get(url);
          const validated = schema.parse(response.data);
          await fs.writeFile('./output.json', JSON.stringify(validated));
          return validated;
        }
      `;

      const patterns = await parser.detectPatterns(content, []);

      expect(patterns.some((p) => p.type === 'api-call')).toBe(true);
      expect(patterns.some((p) => p.type === 'file-operation')).toBe(true);
      expect(patterns.some((p) => p.type === 'validation-logic')).toBe(true);
      expect(patterns.some((p) => p.type === 'external-dependency')).toBe(true);
    });

    it('should return empty array for content with no patterns', async () => {
      const content = `
        function simpleAdd(a: number, b: number): number {
          return a + b;
        }
      `;

      const patterns = await parser.detectPatterns(content, []);

      expect(patterns).toEqual([]);
    });

    it('should limit evidence samples', async () => {
      const content = `
        // Many API calls
        fetch('/api/1'); fetch('/api/2'); fetch('/api/3');
        fetch('/api/4'); fetch('/api/5'); fetch('/api/6');
      `;

      const patterns = await parser.detectPatterns(content, []);

      const apiPattern = patterns.find((p) => p.type === 'api-call');
      expect(apiPattern?.evidence.length).toBeLessThanOrEqual(3);
    });

    it('should calculate confidence based on frequency', async () => {
      const singleCallContent = `
        function test() {
          fetch('/api');
        }
      `;

      const multipleCallsContent = `
        function test() {
          fetch('/api/1');
          fetch('/api/2');
          fetch('/api/3');
          fetch('/api/4');
        }
      `;

      const singlePatterns = await parser.detectPatterns(singleCallContent, []);
      const multiplePatterns = await parser.detectPatterns(multipleCallsContent, []);

      const singleApiPattern = singlePatterns.find((p) => p.type === 'api-call');
      const multipleApiPattern = multiplePatterns.find((p) => p.type === 'api-call');

      expect(multipleApiPattern?.confidence).toBeGreaterThan(singleApiPattern?.confidence ?? 0);
    });
  });

  describe('integration', () => {
    it('should work end-to-end with real TypeScript code', async () => {
      const content = `
        import axios from 'axios';
        import { z } from 'zod';
        
        const UserSchema = z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().email(),
        });
        
        /**
         * Fetches and validates user data from API
         * @param userId The user ID to fetch
         * @returns Validated user object
         */
        export async function fetchUser(userId: string): Promise<z.infer<typeof UserSchema>> {
          if (!userId || userId.trim().length === 0) {
            throw new Error('User ID is required');
          }
          
          try {
            const response = await axios.get(\`/api/users/\${userId}\`);
            const validatedUser = UserSchema.parse(response.data);
            
            // Also test schema.validate pattern
            const isValid = UserSchema.validate(response.data);
            
            return validatedUser;
          } catch (error) {
            if (error instanceof z.ZodError) {
              throw new Error('Invalid user data received from API');
            }
            throw error;
          }
        }
      `;

      const functions = await parser.parseFile('/user-service.ts', content);
      const patterns = await parser.detectPatterns(content, functions);

      // Should parse the function correctly
      expect(functions).toHaveLength(1);
      expect(functions[0]).toMatchObject({
        name: 'fetchUser',
        isExported: true,
        isAsync: true,
        parameters: [{ name: 'userId', type: 'string', optional: false }],
        returnType: 'Promise<z.infer<typeof UserSchema>>',
      });

      // Should detect relevant patterns
      expect(patterns.some((p) => p.type === 'api-call')).toBe(true);
      expect(patterns.some((p) => p.type === 'validation-logic')).toBe(true);
      expect(patterns.some((p) => p.type === 'external-dependency')).toBe(true);

      // Should have documentation
      expect(functions[0].documentation).toContain('Fetches and validates user data');

      // Should calculate meaningful complexity
      expect(functions[0].complexity.cyclomaticComplexity).toBeGreaterThan(3);
      expect(functions[0].complexity.linesOfCode).toBeGreaterThan(10);
    });
  });
});
