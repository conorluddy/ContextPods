/**
 * Tool Implementation Examples
 * 
 * This example demonstrates how to create and use MCP tools with proper
 * schema validation, error handling, and TypeScript integration.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../templates/typescript-advanced/src/utils/logger.js';

// Input/Output schemas using Zod for runtime validation
const CalculatorInput = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide'], {
    description: 'Mathematical operation to perform',
  }),
  a: z.number().describe('First number'),
  b: z.number().describe('Second number'),
});

const CalculatorOutput = z.object({
  result: z.number().describe('Calculation result'),
  expression: z.string().describe('Human-readable expression'),
  timestamp: z.string().describe('When calculation was performed'),
});

type CalculatorInput = z.infer<typeof CalculatorInput>;
type CalculatorOutput = z.infer<typeof CalculatorOutput>;

const TextAnalysisInput = z.object({
  text: z.string().min(1).describe('Text to analyze'),
  includeReadability: z.boolean().optional().describe('Include readability metrics'),
  language: z.enum(['en', 'es', 'fr', 'de']).optional().describe('Text language'),
});

const TextAnalysisOutput = z.object({
  wordCount: z.number().describe('Total word count'),
  characterCount: z.number().describe('Total character count'),
  sentenceCount: z.number().describe('Number of sentences'),
  sentiment: z.object({
    score: z.number().min(-1).max(1).describe('Sentiment score (-1 to 1)'),
    label: z.enum(['negative', 'neutral', 'positive']).describe('Sentiment classification'),
  }),
  readability: z.object({
    fleschScore: z.number().describe('Flesch reading ease score'),
    grade: z.string().describe('Grade level estimate'),
  }).optional(),
  keywords: z.array(z.string()).describe('Extracted keywords'),
});

type TextAnalysisInput = z.infer<typeof TextAnalysisInput>;
type TextAnalysisOutput = z.infer<typeof TextAnalysisOutput>;

const CodeGeneratorInput = z.object({
  language: z.enum(['javascript', 'typescript', 'python', 'rust', 'go'], {
    description: 'Programming language for code generation',
  }),
  template: z.enum(['function', 'class', 'interface', 'test', 'component'], {
    description: 'Code template type',
  }),
  name: z.string().min(1).describe('Name for the generated code element'),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    optional: z.boolean().optional(),
  })).optional().describe('Function/method parameters'),
  description: z.string().optional().describe('Documentation string'),
});

const CodeGeneratorOutput = z.object({
  code: z.string().describe('Generated code'),
  language: z.string().describe('Programming language used'),
  template: z.string().describe('Template type used'),
  metadata: z.object({
    lineCount: z.number(),
    estimatedComplexity: z.enum(['low', 'medium', 'high']),
    dependencies: z.array(z.string()),
  }),
});

type CodeGeneratorInput = z.infer<typeof CodeGeneratorInput>;
type CodeGeneratorOutput = z.infer<typeof CodeGeneratorOutput>;

/**
 * Calculator tool implementation
 */
async function calculateHandler(args: CalculatorInput): Promise<CalculatorOutput> {
  logger.info('Processing calculation', { operation: args.operation, a: args.a, b: args.b });

  let result: number;
  let expression: string;

  try {
    switch (args.operation) {
      case 'add':
        result = args.a + args.b;
        expression = `${args.a} + ${args.b} = ${result}`;
        break;
      case 'subtract':
        result = args.a - args.b;
        expression = `${args.a} - ${args.b} = ${result}`;
        break;
      case 'multiply':
        result = args.a * args.b;
        expression = `${args.a} × ${args.b} = ${result}`;
        break;
      case 'divide':
        if (args.b === 0) {
          throw new Error('Division by zero is not allowed');
        }
        result = args.a / args.b;
        expression = `${args.a} ÷ ${args.b} = ${result}`;
        break;
      default:
        throw new Error(`Unsupported operation: ${args.operation}`);
    }

    return {
      result,
      expression,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Calculation failed', { error, args });
    throw new Error(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Text analysis tool implementation
 */
async function analyzeTextHandler(args: TextAnalysisInput): Promise<TextAnalysisOutput> {
  logger.info('Analyzing text', { 
    length: args.text.length, 
    language: args.language,
    includeReadability: args.includeReadability 
  });

  try {
    // Basic text metrics
    const words = args.text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = args.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const characters = args.text.length;

    // Simple sentiment analysis (mock implementation)
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'worst'];
    
    let sentimentScore = 0;
    const lowerText = args.text.toLowerCase();
    
    positiveWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      sentimentScore += matches * 0.1;
    });
    
    negativeWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      sentimentScore -= matches * 0.1;
    });

    // Clamp sentiment score between -1 and 1
    sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
    
    const sentimentLabel = sentimentScore > 0.1 ? 'positive' : 
                          sentimentScore < -0.1 ? 'negative' : 'neutral';

    // Extract keywords (simple implementation)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const keywords = words
      .map(word => word.toLowerCase().replace(/[^\w]/g, ''))
      .filter(word => word.length > 3 && !commonWords.has(word))
      .reduce((acc: Record<string, number>, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});

    const topKeywords = Object.entries(keywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    const result: TextAnalysisOutput = {
      wordCount: words.length,
      characterCount: characters,
      sentenceCount: sentences.length,
      sentiment: {
        score: Math.round(sentimentScore * 100) / 100,
        label: sentimentLabel,
      },
      keywords: topKeywords,
    };

    // Add readability metrics if requested
    if (args.includeReadability) {
      const avgWordsPerSentence = words.length / sentences.length;
      const avgSyllablesPerWord = 1.5; // Simplified estimate
      
      // Flesch Reading Ease Score
      const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
      
      let grade = 'Graduate';
      if (fleschScore >= 90) grade = '5th grade';
      else if (fleschScore >= 80) grade = '6th grade';
      else if (fleschScore >= 70) grade = '7th grade';
      else if (fleschScore >= 60) grade = '8th-9th grade';
      else if (fleschScore >= 50) grade = '10th-12th grade';
      else if (fleschScore >= 30) grade = 'College';

      result.readability = {
        fleschScore: Math.round(fleschScore * 10) / 10,
        grade,
      };
    }

    return result;
  } catch (error) {
    logger.error('Text analysis failed', { error, args });
    throw new Error(`Text analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Code generator tool implementation
 */
async function generateCodeHandler(args: CodeGeneratorInput): Promise<CodeGeneratorOutput> {
  logger.info('Generating code', { 
    language: args.language, 
    template: args.template, 
    name: args.name 
  });

  try {
    let code = '';
    const dependencies: string[] = [];
    let estimatedComplexity: 'low' | 'medium' | 'high' = 'low';

    const params = args.parameters || [];
    const description = args.description || `${args.template} implementation`;

    switch (args.language) {
      case 'typescript':
        code = generateTypeScriptCode(args.template, args.name, params, description);
        if (args.template === 'class' || args.template === 'interface') {
          estimatedComplexity = 'medium';
        }
        break;
        
      case 'javascript':
        code = generateJavaScriptCode(args.template, args.name, params, description);
        break;
        
      case 'python':
        code = generatePythonCode(args.template, args.name, params, description);
        if (args.template === 'class') {
          estimatedComplexity = 'medium';
        }
        break;
        
      case 'rust':
        code = generateRustCode(args.template, args.name, params, description);
        estimatedComplexity = 'high';
        break;
        
      case 'go':
        code = generateGoCode(args.template, args.name, params, description);
        break;
        
      default:
        throw new Error(`Unsupported language: ${args.language}`);
    }

    const lineCount = code.split('\n').length;
    
    return {
      code,
      language: args.language,
      template: args.template,
      metadata: {
        lineCount,
        estimatedComplexity,
        dependencies,
      },
    };
  } catch (error) {
    logger.error('Code generation failed', { error, args });
    throw new Error(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Code generation helpers
function generateTypeScriptCode(template: string, name: string, params: any[], description: string): string {
  const paramString = params.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ');
  
  switch (template) {
    case 'function':
      return `/**\n * ${description}\n */\nexport function ${name}(${paramString}): void {\n  // TODO: Implement\n}`;
    case 'class':
      return `/**\n * ${description}\n */\nexport class ${name} {\n  constructor(${paramString}) {\n    // TODO: Implement\n  }\n}`;
    case 'interface':
      return `/**\n * ${description}\n */\nexport interface ${name} {\n  // TODO: Define properties\n}`;
    case 'test':
      return `import { describe, it, expect } from 'vitest';\n\ndescribe('${name}', () => {\n  it('${description}', () => {\n    // TODO: Write test\n    expect(true).toBe(true);\n  });\n});`;
    default:
      return `// ${description}\nexport const ${name} = {};`;
  }
}

function generateJavaScriptCode(template: string, name: string, params: any[], description: string): string {
  const paramString = params.map(p => p.name).join(', ');
  
  switch (template) {
    case 'function':
      return `/**\n * ${description}\n */\nfunction ${name}(${paramString}) {\n  // TODO: Implement\n}\n\nmodule.exports = ${name};`;
    case 'class':
      return `/**\n * ${description}\n */\nclass ${name} {\n  constructor(${paramString}) {\n    // TODO: Implement\n  }\n}\n\nmodule.exports = ${name};`;
    default:
      return `// ${description}\nconst ${name} = {};\n\nmodule.exports = ${name};`;
  }
}

function generatePythonCode(template: string, name: string, params: any[], description: string): string {
  const paramString = params.map(p => p.name).join(', ');
  
  switch (template) {
    case 'function':
      return `def ${name}(${paramString}):\n    \"\"\"${description}\"\"\"\n    # TODO: Implement\n    pass`;
    case 'class':
      return `class ${name}:\n    \"\"\"${description}\"\"\"\n    \n    def __init__(self, ${paramString}):\n        # TODO: Implement\n        pass`;
    default:
      return `# ${description}\n${name} = {}`;
  }
}

function generateRustCode(template: string, name: string, params: any[], description: string): string {
  switch (template) {
    case 'function':
      return `/// ${description}\npub fn ${name}() {\n    // TODO: Implement\n}`;
    case 'class':
      return `/// ${description}\npub struct ${name} {\n    // TODO: Define fields\n}\n\nimpl ${name} {\n    pub fn new() -> Self {\n        // TODO: Implement\n        Self {}\n    }\n}`;
    default:
      return `// ${description}\npub const ${name}: () = ();`;
  }
}

function generateGoCode(template: string, name: string, params: any[], description: string): string {
  switch (template) {
    case 'function':
      return `// ${description}\nfunc ${name}() {\n\t// TODO: Implement\n}`;
    case 'class':
      return `// ${description}\ntype ${name} struct {\n\t// TODO: Define fields\n}\n\n// New${name} creates a new ${name}\nfunc New${name}() *${name} {\n\treturn &${name}{}\n}`;
    default:
      return `// ${description}\nvar ${name} interface{} = nil`;
  }
}

/**
 * Example tool definitions for MCP server
 */
export const exampleTools: Tool[] = [
  {
    name: 'calculate',
    description: 'Perform mathematical calculations with basic operators',
    inputSchema: zodToJsonSchema(CalculatorInput),
    outputSchema: zodToJsonSchema(CalculatorOutput),
  },
  {
    name: 'analyze-text',
    description: 'Analyze text for metrics, sentiment, and keywords',
    inputSchema: zodToJsonSchema(TextAnalysisInput),
    outputSchema: zodToJsonSchema(TextAnalysisOutput),
  },
  {
    name: 'generate-code',
    description: 'Generate code snippets in various programming languages',
    inputSchema: zodToJsonSchema(CodeGeneratorInput),
    outputSchema: zodToJsonSchema(CodeGeneratorOutput),
  },
];

/**
 * Tool handlers map for easy registration
 */
export const exampleToolHandlers = new Map([
  ['calculate', calculateHandler],
  ['analyze-text', analyzeTextHandler],
  ['generate-code', generateCodeHandler],
]);

/**
 * Example usage demonstration
 */
export async function demonstrateTools(): Promise<void> {
  console.log('🔧 Tool Examples Demonstration\n');

  try {
    // Calculator example
    console.log('1. Calculator Tool');
    const calcResult = await calculateHandler({
      operation: 'multiply',
      a: 12,
      b: 8,
    });
    console.log(`   Result: ${calcResult.expression}`);
    console.log(`   Timestamp: ${calcResult.timestamp}\n`);

    // Text analysis example
    console.log('2. Text Analysis Tool');
    const textResult = await analyzeTextHandler({
      text: 'This is a wonderful example of text analysis. The tool provides great insights into content metrics and sentiment analysis.',
      includeReadability: true,
      language: 'en',
    });
    console.log(`   Words: ${textResult.wordCount}, Characters: ${textResult.characterCount}`);
    console.log(`   Sentiment: ${textResult.sentiment.label} (${textResult.sentiment.score})`);
    console.log(`   Keywords: ${textResult.keywords.slice(0, 3).join(', ')}\n`);

    // Code generation example
    console.log('3. Code Generator Tool');
    const codeResult = await generateCodeHandler({
      language: 'typescript',
      template: 'function',
      name: 'processData',
      parameters: [
        { name: 'data', type: 'string[]', optional: false },
        { name: 'options', type: 'ProcessOptions', optional: true },
      ],
      description: 'Process an array of data with optional configuration',
    });
    console.log(`   Generated ${codeResult.metadata.lineCount} lines of ${codeResult.language}`);
    console.log(`   Complexity: ${codeResult.metadata.estimatedComplexity}`);
    console.log(`   Code preview:\n${codeResult.code.split('\n').slice(0, 3).join('\n')}...\n`);

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  }
}

// Run demonstration if this file is executed directly
if (import.meta.url === new URL(import.meta.resolve('./example.ts')).href) {
  demonstrateTools().catch(console.error);
}