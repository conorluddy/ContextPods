/**
 * TypeScript/JavaScript parser using TypeScript Compiler API
 */

import * as ts from 'typescript';

import { logger } from '../../logger.js';
import {
  type FunctionMetadata,
  type FunctionParameter,
  type DetectedPattern,
  TemplateLanguage,
} from '../../types.js';

import { BaseParser } from './base-parser.js';

/**
 * TypeScript parser implementation
 */
export class TypeScriptParser extends BaseParser {
  constructor(language: TemplateLanguage = TemplateLanguage.TYPESCRIPT) {
    super(language);
  }

  /**
   * Parse TypeScript/JavaScript file and extract function metadata
   */
  async parseFile(filePath: string, content: string): Promise<FunctionMetadata[]> {
    try {
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

      const functions: FunctionMetadata[] = [];

      const visit = (node: ts.Node): void => {
        // Function declarations
        if (ts.isFunctionDeclaration(node) && node.name) {
          const func = this.extractFunctionMetadata(node, sourceFile, content);
          if (func) {
            functions.push(func);
          }
        }

        // Arrow functions assigned to variables
        if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach((decl) => {
            if (
              ts.isVariableDeclaration(decl) &&
              decl.initializer &&
              ts.isArrowFunction(decl.initializer) &&
              ts.isIdentifier(decl.name)
            ) {
              const func = this.extractArrowFunctionMetadata(
                decl.name.text,
                decl.initializer,
                sourceFile,
                content,
              );
              if (func) {
                functions.push(func);
              }
            }
          });
        }

        // Method declarations in classes
        if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
          const func = this.extractMethodMetadata(node, sourceFile, content);
          if (func) {
            functions.push(func);
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      logger.debug(`Extracted ${functions.length} functions from ${filePath}`);
      return functions;
    } catch (error) {
      logger.error(`Failed to parse TypeScript file: ${filePath}`, { error });
      return [];
    }
  }

  /**
   * Detect patterns in TypeScript/JavaScript code
   */
  async detectPatterns(
    content: string,
    _functions: FunctionMetadata[],
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // API call patterns
    const apiPatterns = [
      /fetch\s*\(/g,
      /axios\.(get|post|put|delete|patch)/g,
      /http\.(get|post|put|delete|patch)/g,
      /request\s*\(/g,
      /\.then\s*\(/g,
      /await\s+fetch/g,
    ];

    apiPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push({
          type: 'api-call',
          confidence: Math.min(0.9, matches.length * 0.3),
          description: `HTTP API calls detected (${matches.length} occurrences)`,
          evidence: matches.slice(0, 3),
        });
      }
    });

    // File operation patterns
    const filePatterns = [
      /fs\.(readFile|writeFile|readdir|stat)/g,
      /path\.(join|resolve|dirname)/g,
      /require\s*\(\s*['"]fs['"]\s*\)/g,
      /import.*fs.*from/g,
    ];

    filePatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push({
          type: 'file-operation',
          confidence: Math.min(0.8, matches.length * 0.4),
          description: `File system operations detected (${matches.length} occurrences)`,
          evidence: matches.slice(0, 3),
        });
      }
    });

    // Database patterns
    const dbPatterns = [
      /\.(query|exec|execute)\s*\(/g,
      /SELECT\s+.*FROM/gi,
      /INSERT\s+INTO/gi,
      /UPDATE\s+.*SET/gi,
      /DELETE\s+FROM/gi,
      /mongoose\./g,
      /prisma\./g,
    ];

    dbPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push({
          type: 'database-query',
          confidence: Math.min(0.9, matches.length * 0.5),
          description: `Database operations detected (${matches.length} occurrences)`,
          evidence: matches.slice(0, 3),
        });
      }
    });

    // Validation patterns
    const validationPatterns = [
      /zod\./g,
      /joi\./g,
      /yup\./g,
      /validate\(/g,
      /\.isValid/g,
      /schema\.(parse|validate)/g,
    ];

    validationPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push({
          type: 'validation-logic',
          confidence: Math.min(0.8, matches.length * 0.3),
          description: `Validation logic detected (${matches.length} occurrences)`,
          evidence: matches.slice(0, 3),
        });
      }
    });

    // External dependency patterns
    const depMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g);
    if (depMatches) {
      const externalDeps = depMatches.filter(
        (dep) => !dep.includes('./') && !dep.includes('../') && !dep.includes('node:'),
      );

      if (externalDeps.length > 0) {
        patterns.push({
          type: 'external-dependency',
          confidence: Math.min(0.7, externalDeps.length * 0.2),
          description: `External dependencies detected (${externalDeps.length} imports)`,
          evidence: externalDeps.slice(0, 5),
        });
      }
    }

    return patterns;
  }

  /**
   * Extract metadata from function declaration
   */
  private extractFunctionMetadata(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile,
    _content: string,
  ): FunctionMetadata | null {
    if (!node.name) return null;

    const name = node.name.text;
    const startPos = node.getStart(sourceFile);
    const endPos = node.getEnd();
    const startLine = sourceFile.getLineAndCharacterOfPosition(startPos).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(endPos).line + 1;

    // Extract parameters
    const parameters: FunctionParameter[] = [];
    if (node.parameters) {
      node.parameters.forEach((param) => {
        if (ts.isIdentifier(param.name)) {
          parameters.push({
            name: param.name.text,
            type: param.type ? param.type.getText(sourceFile) : undefined,
            optional: !!param.questionToken,
            defaultValue: param.initializer ? param.initializer.getText(sourceFile) : undefined,
          });
        }
      });
    }

    // Check if exported
    const isExported =
      node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword) || false;

    // Check if async
    const isAsync = node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.AsyncKeyword) || false;

    // Get return type
    const returnType = node.type ? node.type.getText(sourceFile) : undefined;

    // Extract JSDoc documentation
    const jsDoc = ts.getJSDocCommentsAndTags(node);
    const documentation =
      jsDoc.length > 0 ? jsDoc.map((doc) => doc.getText(sourceFile)).join('\n') : undefined;

    // Calculate basic complexity metrics
    const functionText = node.getText(sourceFile);
    const complexity = this.calculateComplexity(functionText);

    return {
      name,
      signature: this.extractSignature(node, sourceFile),
      parameters,
      returnType,
      complexity,
      location: {
        filePath: sourceFile.fileName,
        startLine,
        endLine,
      },
      documentation,
      isExported,
      isAsync,
    };
  }

  /**
   * Extract metadata from arrow function
   */
  private extractArrowFunctionMetadata(
    name: string,
    node: ts.ArrowFunction,
    sourceFile: ts.SourceFile,
    _content: string,
  ): FunctionMetadata | null {
    const startPos = node.getStart(sourceFile);
    const endPos = node.getEnd();
    const startLine = sourceFile.getLineAndCharacterOfPosition(startPos).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(endPos).line + 1;

    // Extract parameters
    const parameters: FunctionParameter[] = [];
    node.parameters.forEach((param) => {
      if (ts.isIdentifier(param.name)) {
        parameters.push({
          name: param.name.text,
          type: param.type ? param.type.getText(sourceFile) : undefined,
          optional: !!param.questionToken,
          defaultValue: param.initializer ? param.initializer.getText(sourceFile) : undefined,
        });
      }
    });

    // Check if async
    const isAsync = node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.AsyncKeyword) || false;

    // Get return type
    const returnType = node.type ? node.type.getText(sourceFile) : undefined;

    // Calculate basic complexity metrics
    const functionText = node.getText(sourceFile);
    const complexity = this.calculateComplexity(functionText);

    return {
      name,
      signature: `${name} = ${node.getText(sourceFile).substring(0, 100)}...`,
      parameters,
      returnType,
      complexity,
      location: {
        filePath: sourceFile.fileName,
        startLine,
        endLine,
      },
      documentation: undefined, // Arrow functions typically don't have JSDoc
      isExported: false, // Would need to check parent context
      isAsync,
    };
  }

  /**
   * Extract metadata from method declaration
   */
  private extractMethodMetadata(
    node: ts.MethodDeclaration,
    sourceFile: ts.SourceFile,
    _content: string,
  ): FunctionMetadata | null {
    if (!ts.isIdentifier(node.name)) return null;

    const name = node.name.text;
    const startPos = node.getStart(sourceFile);
    const endPos = node.getEnd();
    const startLine = sourceFile.getLineAndCharacterOfPosition(startPos).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(endPos).line + 1;

    // Extract parameters
    const parameters: FunctionParameter[] = [];
    node.parameters.forEach((param) => {
      if (ts.isIdentifier(param.name)) {
        parameters.push({
          name: param.name.text,
          type: param.type ? param.type.getText(sourceFile) : undefined,
          optional: !!param.questionToken,
          defaultValue: param.initializer ? param.initializer.getText(sourceFile) : undefined,
        });
      }
    });

    // Check if public (exported)
    const isExported = !node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.PrivateKeyword);

    // Check if async
    const isAsync = node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.AsyncKeyword) || false;

    // Get return type
    const returnType = node.type ? node.type.getText(sourceFile) : undefined;

    // Extract JSDoc documentation
    const jsDoc = ts.getJSDocCommentsAndTags(node);
    const documentation =
      jsDoc.length > 0 ? jsDoc.map((doc) => doc.getText(sourceFile)).join('\n') : undefined;

    // Calculate basic complexity metrics
    const functionText = node.getText(sourceFile);
    const complexity = this.calculateComplexity(functionText);

    return {
      name,
      signature: this.extractMethodSignature(node, sourceFile),
      parameters,
      returnType,
      complexity,
      location: {
        filePath: sourceFile.fileName,
        startLine,
        endLine,
      },
      documentation,
      isExported,
      isAsync,
    };
  }

  /**
   * Extract function signature
   */
  private extractSignature(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): string {
    const name = node.name?.text || 'anonymous';
    const params = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
    const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : '';
    const async = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
      ? 'async '
      : '';

    return `${async}function ${name}(${params})${returnType}`;
  }

  /**
   * Extract method signature
   */
  private extractMethodSignature(node: ts.MethodDeclaration, sourceFile: ts.SourceFile): string {
    const name = ts.isIdentifier(node.name) ? node.name.text : 'unknown';
    const params = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
    const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : '';
    const async = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
      ? 'async '
      : '';

    return `${async}${name}(${params})${returnType}`;
  }

  /**
   * Calculate basic complexity metrics
   */
  private calculateComplexity(code: string): {
    cyclomaticComplexity: number;
    linesOfCode: number;
    dependencies: number;
  } {
    // Simple cyclomatic complexity calculation
    const complexityPatterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /\?/g, // ternary operator
    ];

    let cyclomaticComplexity = 1; // Base complexity
    complexityPatterns.forEach((pattern) => {
      const matches = code.match(pattern);
      if (matches) {
        cyclomaticComplexity += matches.length;
      }
    });

    // Lines of code (excluding empty lines and comments)
    const lines = code.split('\n');
    const linesOfCode = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('/*')
      );
    }).length;

    // Count dependencies (imports/requires)
    const depMatches = code.match(/(?:import|require).*from|require\s*\(/g);
    const dependencies = depMatches ? depMatches.length : 0;

    return {
      cyclomaticComplexity,
      linesOfCode,
      dependencies,
    };
  }
}
