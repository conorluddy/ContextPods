/**
 * LLM Sampling and Integration Examples
 * 
 * This example demonstrates how to leverage Large Language Model capabilities
 * within MCP servers using the sampling pattern.
 */

import type { SamplingMessage } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../templates/typescript-advanced/src/utils/logger.js';

/**
 * Model configuration for different use cases
 */
interface ModelConfig {
  name: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  useCase: string;
}

/**
 * Analysis result structure
 */
interface AnalysisResult {
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  keyPoints: string[];
  recommendations?: string[];
}

/**
 * Code generation request
 */
interface CodeGenerationRequest {
  language: string;
  description: string;
  requirements: string[];
  style?: 'functional' | 'object-oriented' | 'minimal';
}

/**
 * Content enhancement request
 */
interface ContentEnhancementRequest {
  content: string;
  targetAudience: string;
  enhancementType: 'clarity' | 'engagement' | 'professional' | 'technical';
  length?: 'shorter' | 'longer' | 'same';
}

/**
 * LLM Sampling Service
 * Provides high-level interfaces for common LLM tasks
 */
export class LLMSamplingService {
  private modelConfigs = new Map<string, ModelConfig>([
    ['fast-analysis', {
      name: 'claude-3-haiku-20240307',
      maxTokens: 1000,
      temperature: 0.3,
      topP: 0.9,
      useCase: 'Quick analysis and simple tasks',
    }],
    ['detailed-analysis', {
      name: 'claude-3-sonnet-20240229',
      maxTokens: 2000,
      temperature: 0.5,
      topP: 0.9,
      useCase: 'Detailed analysis and reasoning',
    }],
    ['creative-generation', {
      name: 'claude-3-opus-20240229',
      maxTokens: 3000,
      temperature: 0.8,
      topP: 0.9,
      useCase: 'Creative writing and generation',
    }],
    ['code-generation', {
      name: 'claude-3-sonnet-20240229',
      maxTokens: 2000,
      temperature: 0.2,
      topP: 0.9,
      useCase: 'Code generation and technical tasks',
    }],
  ]);

  /**
   * Create a sampling request with appropriate configuration
   */
  createSamplingRequest(
    messages: SamplingMessage[], 
    configKey: string = 'detailed-analysis'
  ): any {
    const config = this.modelConfigs.get(configKey);
    if (!config) {
      throw new Error(`Unknown model configuration: ${configKey}`);
    }

    return {
      method: 'sampling/createMessage',
      params: {
        messages,
        modelPreferences: {
          hints: [{ name: config.name }],
          costPriority: 0.5,
          speedPriority: configKey === 'fast-analysis' ? 0.8 : 0.5,
          intelligencePriority: configKey === 'creative-generation' ? 0.9 : 0.7,
        },
        systemPrompt: this.getSystemPrompt(configKey),
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        topP: config.topP,
        metadata: {
          useCase: config.useCase,
          requestedAt: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Analyze content using LLM capabilities
   */
  async analyzeContent(
    content: string, 
    analysisType: 'sentiment' | 'summary' | 'insights' | 'classification' = 'summary'
  ): Promise<AnalysisResult> {
    logger.info('Starting content analysis', { 
      contentLength: content.length, 
      analysisType 
    });

    const systemPrompt = this.getAnalysisSystemPrompt(analysisType);
    const userPrompt = this.formatAnalysisPrompt(content, analysisType);

    const messages: SamplingMessage[] = [
      {
        role: 'system',
        content: {
          type: 'text',
          text: systemPrompt,
        },
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: userPrompt,
        },
      },
    ];

    const samplingRequest = this.createSamplingRequest(messages, 'detailed-analysis');
    
    // In a real implementation, this would be sent to the MCP client
    // For demonstration, we'll simulate the response
    const mockResponse = await this.simulateLLMResponse(samplingRequest, analysisType);
    
    return this.parseAnalysisResponse(mockResponse, analysisType);
  }

  /**
   * Generate code using LLM capabilities
   */
  async generateCode(request: CodeGenerationRequest): Promise<{
    code: string;
    explanation: string;
    tests?: string;
    documentation?: string;
  }> {
    logger.info('Starting code generation', { 
      language: request.language, 
      description: request.description 
    });

    const systemPrompt = `You are an expert ${request.language} developer. Generate clean, well-documented, and efficient code that follows best practices.`;
    
    const userPrompt = `Generate ${request.language} code for: ${request.description}

Requirements:
${request.requirements.map(req => `- ${req}`).join('\n')}

Style: ${request.style || 'clean and readable'}

Please provide:
1. The main code implementation
2. Clear explanation of the approach
3. Example usage (if applicable)
4. Basic tests (if appropriate)`;

    const messages: SamplingMessage[] = [
      {
        role: 'system',
        content: { type: 'text', text: systemPrompt },
      },
      {
        role: 'user',
        content: { type: 'text', text: userPrompt },
      },
    ];

    const samplingRequest = this.createSamplingRequest(messages, 'code-generation');
    const mockResponse = await this.simulateLLMResponse(samplingRequest, 'code');

    return this.parseCodeResponse(mockResponse);
  }

  /**
   * Enhance content using LLM capabilities
   */
  async enhanceContent(request: ContentEnhancementRequest): Promise<{
    enhancedContent: string;
    changes: string[];
    improvements: string[];
  }> {
    logger.info('Starting content enhancement', { 
      contentLength: request.content.length, 
      enhancementType: request.enhancementType 
    });

    const systemPrompt = this.getEnhancementSystemPrompt(request.enhancementType, request.targetAudience);
    
    const userPrompt = `Please enhance the following content:

${request.content}

Target audience: ${request.targetAudience}
Enhancement type: ${request.enhancementType}
${request.length ? `Length preference: ${request.length}` : ''}

Provide the enhanced version and explain the key improvements made.`;

    const messages: SamplingMessage[] = [
      {
        role: 'system',
        content: { type: 'text', text: systemPrompt },
      },
      {
        role: 'user',
        content: { type: 'text', text: userPrompt },
      },
    ];

    const samplingRequest = this.createSamplingRequest(messages, 'creative-generation');
    const mockResponse = await this.simulateLLMResponse(samplingRequest, 'enhancement');

    return this.parseEnhancementResponse(mockResponse);
  }

  private getSystemPrompt(configKey: string): string {
    const prompts = {
      'fast-analysis': 'You are a helpful assistant focused on providing quick, accurate analysis.',
      'detailed-analysis': 'You are an expert analyst providing thorough, well-reasoned insights.',
      'creative-generation': 'You are a creative assistant skilled in generating engaging, original content.',
      'code-generation': 'You are an expert software developer focused on clean, efficient, and well-documented code.',
    };

    return prompts[configKey as keyof typeof prompts] || prompts['detailed-analysis'];
  }

  private getAnalysisSystemPrompt(analysisType: string): string {
    const prompts = {
      sentiment: 'You are an expert sentiment analyst. Analyze text for emotional tone, providing clear classifications and confidence scores.',
      summary: 'You are an expert at creating concise, accurate summaries that capture key information and insights.',
      insights: 'You are a business analyst expert at extracting actionable insights and patterns from content.',
      classification: 'You are an expert content classifier skilled at categorizing and organizing information.',
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.summary;
  }

  private formatAnalysisPrompt(content: string, analysisType: string): string {
    const prompts = {
      sentiment: `Analyze the sentiment of this content:\n\n${content}\n\nProvide sentiment classification (positive/negative/neutral), confidence score (0-1), and key emotional indicators.`,
      summary: `Summarize this content, highlighting key points:\n\n${content}\n\nProvide a clear summary and list the most important points.`,
      insights: `Extract key insights and patterns from this content:\n\n${content}\n\nIdentify trends, opportunities, and actionable recommendations.`,
      classification: `Classify and categorize this content:\n\n${content}\n\nProvide classification categories and explain the reasoning.`,
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.summary;
  }

  private getEnhancementSystemPrompt(enhancementType: string, targetAudience: string): string {
    const prompts = {
      clarity: `You are an expert editor focused on improving clarity and readability for ${targetAudience}. Make content clearer, more direct, and easier to understand.`,
      engagement: `You are an expert content creator focused on making content more engaging for ${targetAudience}. Add compelling elements while maintaining accuracy.`,
      professional: `You are an expert business writer focused on creating professional, polished content for ${targetAudience}. Enhance formality and credibility.`,
      technical: `You are a technical writing expert focused on making complex information accessible to ${targetAudience}. Improve technical accuracy and clarity.`,
    };

    return prompts[enhancementType as keyof typeof prompts] || prompts.clarity;
  }

  // Mock response simulation for demonstration
  private async simulateLLMResponse(samplingRequest: any, responseType: string): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const responses = {
      sentiment: `Based on my analysis, this content has a **positive** sentiment with a confidence score of 0.85.

Key emotional indicators:
- Positive language: "excellent", "wonderful", "great results"
- Optimistic tone throughout
- Solution-focused approach

The overall sentiment leans positive due to the constructive and encouraging language used.`,

      summary: `## Summary

The content discusses the implementation of advanced MCP features including:
- Tool development with schema validation
- Resource management with subscriptions
- Progress tracking for long operations
- LLM integration capabilities

## Key Points:
- Comprehensive TypeScript implementation
- Focus on developer experience
- Extensive testing and validation
- Production-ready patterns`,

      code: `## Generated Code

\`\`\`typescript
export async function processData(items: DataItem[]): Promise<ProcessedData[]> {
  const results: ProcessedData[] = [];
  
  for (const item of items) {
    const processed = await transformItem(item);
    results.push(processed);
  }
  
  return results;
}
\`\`\`

## Explanation
This implementation provides efficient data processing with proper error handling and type safety.

## Tests
\`\`\`typescript
describe('processData', () => {
  it('should process items correctly', async () => {
    const result = await processData(mockData);
    expect(result).toHaveLength(mockData.length);
  });
});
\`\`\``,

      enhancement: `## Enhanced Content

[Enhanced version of the original content with improved clarity, engagement, and structure]

## Key Improvements:
- Improved readability with clearer structure
- Enhanced engagement through better examples
- Stronger opening and conclusion
- More accessible language for target audience

## Changes Made:
- Reorganized information flow
- Added transitional phrases
- Simplified complex sentences
- Strengthened key messages`,
    };

    return responses[responseType as keyof typeof responses] || responses.summary;
  }

  private parseAnalysisResponse(response: string, analysisType: string): AnalysisResult {
    // Parse the mock response into structured data
    return {
      summary: response.split('\n')[0] || 'Analysis completed',
      sentiment: response.toLowerCase().includes('positive') ? 'positive' : 
                response.toLowerCase().includes('negative') ? 'negative' : 'neutral',
      confidence: 0.85, // Mock confidence score
      keyPoints: [
        'Content demonstrates strong technical knowledge',
        'Well-structured implementation approach',
        'Focus on best practices and maintainability',
      ],
      recommendations: [
        'Consider adding more specific examples',
        'Include performance benchmarks',
        'Add error handling scenarios',
      ],
    };
  }

  private parseCodeResponse(response: string): any {
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    const code = codeMatch ? codeMatch[1] : 'Generated code here';
    
    return {
      code,
      explanation: 'The implementation follows best practices with proper type safety and error handling.',
      tests: 'Basic test suite included for validation.',
      documentation: 'Code is well-documented with clear examples.',
    };
  }

  private parseEnhancementResponse(response: string): any {
    return {
      enhancedContent: 'Enhanced version of the original content with improvements.',
      changes: [
        'Improved sentence structure',
        'Enhanced readability',
        'Better organization',
      ],
      improvements: [
        'Clearer messaging',
        'Better flow and transitions',
        'More engaging language',
      ],
    };
  }

  /**
   * Get available model configurations
   */
  getAvailableModels(): Array<{ key: string; config: ModelConfig }> {
    return Array.from(this.modelConfigs.entries()).map(([key, config]) => ({
      key,
      config,
    }));
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    totalRequests: number;
    modelUsage: Record<string, number>;
    averageTokens: number;
  } {
    // Mock statistics for demonstration
    return {
      totalRequests: 42,
      modelUsage: {
        'claude-3-haiku-20240307': 15,
        'claude-3-sonnet-20240229': 20,
        'claude-3-opus-20240229': 7,
      },
      averageTokens: 1250,
    };
  }
}

/**
 * Example usage demonstration
 */
export async function demonstrateSampling(): Promise<void> {
  console.log('🧠 LLM Sampling Examples Demonstration\n');

  const samplingService = new LLMSamplingService();

  try {
    // Show available models
    const models = samplingService.getAvailableModels();
    console.log('Available Models:');
    models.forEach(({ key, config }) => {
      console.log(`  ${key}: ${config.name} (${config.useCase})`);
    });
    console.log();

    // Content analysis example
    console.log('1. Content Analysis');
    const analysisResult = await samplingService.analyzeContent(
      'This is an excellent example of MCP server implementation. The code quality is wonderful and the documentation is comprehensive.',
      'sentiment'
    );
    
    console.log(`   Sentiment: ${analysisResult.sentiment} (confidence: ${analysisResult.confidence})`);
    console.log(`   Summary: ${analysisResult.summary.slice(0, 100)}...`);
    console.log(`   Key Points: ${analysisResult.keyPoints.length} identified\n`);

    // Code generation example
    console.log('2. Code Generation');
    const codeResult = await samplingService.generateCode({
      language: 'typescript',
      description: 'A utility function to validate email addresses',
      requirements: [
        'Use regular expressions for validation',
        'Return boolean result',
        'Handle edge cases',
      ],
      style: 'functional',
    });
    
    console.log(`   Generated: ${codeResult.code.split('\n').length} lines of code`);
    console.log(`   Explanation: ${codeResult.explanation.slice(0, 80)}...`);
    console.log(`   Tests included: ${codeResult.tests ? 'Yes' : 'No'}\n`);

    // Content enhancement example
    console.log('3. Content Enhancement');
    const enhancementResult = await samplingService.enhanceContent({
      content: 'Our product is good. It has features that work.',
      targetAudience: 'potential customers',
      enhancementType: 'engagement',
      length: 'longer',
    });
    
    console.log(`   Enhanced content length: ${enhancementResult.enhancedContent.length} characters`);
    console.log(`   Improvements made: ${enhancementResult.improvements.length}`);
    console.log(`   Changes: ${enhancementResult.changes.join(', ')}\n`);

    // Usage statistics
    const stats = samplingService.getUsageStats();
    console.log('Usage Statistics:');
    console.log(`   Total Requests: ${stats.totalRequests}`);
    console.log(`   Average Tokens: ${stats.averageTokens}`);
    console.log('   Model Usage:');
    Object.entries(stats.modelUsage).forEach(([model, count]) => {
      console.log(`     ${model}: ${count} requests`);
    });

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  }
}

// Global sampling service instance
export const samplingService = new LLMSamplingService();

// Run demonstration if this file is executed directly
if (import.meta.url === new URL(import.meta.resolve('./example.ts')).href) {
  demonstrateSampling().catch(console.error);
}