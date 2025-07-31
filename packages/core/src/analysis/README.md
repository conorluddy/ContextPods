# Codebase Analysis System

This package provides an AI-powered codebase analysis system for identifying functions that would make excellent MCP (Model Context Protocol) tools. The system uses Abstract Syntax Tree (AST) parsing, pattern detection, and machine learning techniques to score and recommend code opportunities.

## Architecture Overview

```
analysis/
├── README.md                    # This file
├── codebase-analyzer.ts         # Main orchestrator
└── parsers/
    ├── base-parser.ts          # Abstract parser with scoring logic
    └── typescript-parser.ts    # TypeScript/JavaScript implementation
```

## Core Components

### 1. CodebaseAnalyzer

The main orchestrator that coordinates the entire analysis process:

- **File Discovery**: Recursively scans directories with configurable filters
- **Language Detection**: Identifies programming languages from file extensions
- **Parser Coordination**: Routes files to appropriate language parsers
- **Results Aggregation**: Combines and ranks opportunities from all files

```typescript
const analyzer = new DefaultCodebaseAnalyzer();
const results = await analyzer.analyze('/path/to/codebase');
```

### 2. BaseParser

Abstract base class providing the core analysis framework:

- **AST Parsing**: Language-specific function extraction (implemented by subclasses)
- **Pattern Detection**: Identifies MCP-suitable code patterns using regex
- **Scoring Algorithm**: Multi-factor scoring system (0-100 scale)
- **Opportunity Generation**: Creates detailed MCP recommendations

#### Scoring Algorithm

The scoring system evaluates functions based on multiple factors:

```typescript
Base Score Factors:
- Exported functions: +20 points
- Optimal complexity (3-10 cyclomatic): +25 points
- Good size (10-100 LOC): +20 points
- Clear parameters (1-5 params): +15 points
- Documentation present: +10 points
- Async nature: +15 points

Pattern-Based Scoring:
- API calls: +30 points (×confidence)
- File operations: +25 points (×confidence)
- Database queries: +25 points (×confidence)
- Validation logic: +20 points (×confidence)
- External dependencies: +15 points (×confidence)
```

### 3. TypeScript Parser

Production-ready parser for TypeScript and JavaScript files:

- **Full AST Analysis**: Uses TypeScript Compiler API for accurate parsing
- **Function Types**: Supports function declarations, arrow functions, and class methods
- **Metadata Extraction**: Captures signatures, parameters, types, and JSDoc
- **Pattern Detection**: Identifies common patterns like API calls, file operations, database queries

#### Detected Patterns

The parser recognizes several important patterns:

- **API Calls**: `fetch()`, `axios`, HTTP libraries, promise chains
- **File Operations**: Node.js `fs` module, path utilities
- **Database Queries**: SQL patterns, ORM calls (Prisma, Mongoose)
- **Validation**: Schema libraries (Zod, Joi, Yup)
- **External Dependencies**: Third-party imports and usage

## Configuration System

### Analysis Configuration

```typescript
interface AnalysisConfig {
  maxFileSize: number; // Skip files larger than this
  excludePatterns: string[]; // Glob patterns to exclude
  includeTests: boolean; // Whether to analyze test files
  languageSettings: {
    // Per-language settings
    [TemplateLanguage.TYPESCRIPT]: {
      extensions: string[];
      excludePatterns: string[];
      parsingStrategy: 'ast' | 'regex';
      complexity: {
        maxCyclomaticComplexity: number;
        maxLinesOfCode: number;
      };
    };
  };
}
```

### Default Configuration

The system comes with sensible defaults:

- **File Size Limit**: 1MB per file
- **Excluded Patterns**: `node_modules`, `dist`, `build`, `.git`, test files
- **TypeScript Settings**: AST parsing, max complexity 20, max LOC 200
- **Language Support**: TypeScript, JavaScript, Python, Rust, Shell (extensible)

## Usage Examples

### Basic Analysis

```typescript
import { DefaultCodebaseAnalyzer } from '@context-pods/core';

const analyzer = new DefaultCodebaseAnalyzer();
const results = await analyzer.analyze('./src');

console.log(`Found ${results.opportunities.length} opportunities`);
results.opportunities.forEach((opp) => {
  console.log(`${opp.functionName}: ${opp.score}/100`);
});
```

### Advanced Configuration

```typescript
const analyzer = new DefaultCodebaseAnalyzer({
  maxFileSize: 2 * 1024 * 1024, // 2MB
  excludePatterns: ['**/node_modules/**', '**/legacy/**', '**/*.generated.*'],
  includeTests: true,
});

const results = await analyzer.analyze('./src', {
  languageSettings: {
    [TemplateLanguage.TYPESCRIPT]: {
      extensions: ['.ts', '.tsx'],
      excludePatterns: [],
      parsingStrategy: 'ast',
      complexity: {
        maxCyclomaticComplexity: 15,
        maxLinesOfCode: 150,
      },
    },
  },
});
```

### Filtering Results

```typescript
// High-value opportunities only
const highValue = results.opportunities.filter((opp) => opp.score >= 80);

// API integration opportunities
const apiOpps = results.opportunities.filter((opp) => opp.category === 'api-integration');

// Functions with specific patterns
const fileProcessors = results.opportunities.filter((opp) =>
  opp.patterns.some((p) => p.type === 'file-operation'),
);
```

## Result Types

### MCPOpportunity

Each opportunity includes comprehensive metadata:

```typescript
interface MCPOpportunity {
  id: string; // Unique identifier
  functionName: string; // Original function name
  filePath: string; // Source file path
  language: TemplateLanguage; // Programming language
  score: number; // MCP suitability score (0-100)
  category: OpportunityCategory; // Categorization
  description: string; // Human-readable description
  suggestedTemplate: string; // Recommended template
  reasoning: string[]; // Why this is a good opportunity

  implementation: {
    // Implementation guidance
    toolName: string; // Suggested MCP tool name
    toolDescription: string; // Tool description
    inputSchema: object; // JSON schema for inputs
    outputDescription: string; // Expected output format
    dependencies: string[]; // Required dependencies
    complexity: 'low' | 'medium' | 'high';
    estimatedEffort: 'low' | 'medium' | 'high';
  };

  function: FunctionMetadata; // Raw function data
  patterns: DetectedPattern[]; // Detected code patterns
}
```

### Analysis Summary

The analysis provides comprehensive metrics:

```typescript
interface AnalysisSummary {
  totalFiles: number; // Files discovered
  analyzedFiles: number; // Successfully analyzed
  skippedFiles: number; // Skipped or failed
  languageBreakdown: {
    // Files per language
    [language: string]: number;
  };
  analysisTime: number; // Total analysis time (ms)
  errors: string[]; // Analysis errors
  warnings: string[]; // Non-fatal warnings
}
```

## Extending the System

### Adding New Languages

1. Create a new parser extending `BaseParser`:

```typescript
export class PythonParser extends BaseParser {
  constructor() {
    super(TemplateLanguage.PYTHON);
  }

  async parseFile(filePath: string, content: string): Promise<FunctionMetadata[]> {
    // Implement Python AST parsing
  }

  async detectPatterns(content: string, functions: FunctionMetadata[]): Promise<DetectedPattern[]> {
    // Implement Python-specific pattern detection
  }
}
```

2. Register the parser in `DefaultCodebaseAnalyzer`:

```typescript
private getParser(language: TemplateLanguage): BaseParser | null {
  switch (language) {
    case TemplateLanguage.PYTHON:
      return new PythonParser();
    // ... other languages
  }
}
```

### Adding New Patterns

Extend the pattern detection in any parser:

```typescript
// In detectPatterns method
const newPatterns = [/your-pattern-regex/g];

newPatterns.forEach((pattern) => {
  const matches = content.match(pattern);
  if (matches) {
    patterns.push({
      type: 'your-pattern-type',
      confidence: Math.min(0.9, matches.length * 0.3),
      description: `Your pattern detected (${matches.length} occurrences)`,
      evidence: matches.slice(0, 3),
    });
  }
});
```

## Performance Considerations

### File Processing

- Files are processed sequentially to avoid memory issues
- Large files (>1MB by default) are automatically skipped
- AST parsing is cached where possible

### Memory Management

- Function metadata is kept minimal
- File contents are not retained after parsing
- Results are streamed rather than accumulated

### Error Handling

- Individual file failures don't stop the overall analysis
- All errors are captured in the summary
- Graceful degradation for unsupported languages

## Integration with Context-Pods

The analysis system integrates seamlessly with the Context-Pods ecosystem:

- **Template Recommendations**: Automatically suggests the best template for each opportunity
- **MCP Tool Generation**: Results can be used to generate actual MCP tools
- **Validation Integration**: Works with the Context-Pods validation system
- **Registry Support**: Opportunities can be tracked in the server registry

## Future Enhancements

### Planned Features

- **Python Support**: Full AST parsing for Python files
- **Go/Rust Support**: Pattern-based analysis for systems languages
- **Security Analysis**: Detection of security-relevant functions
- **Performance Scoring**: Identification of performance-critical code
- **ML Enhancement**: Machine learning models for better scoring

### API Improvements

- **Streaming Results**: Real-time analysis progress
- **Incremental Analysis**: Only analyze changed files
- **Parallel Processing**: Multi-threaded file processing
- **Cloud Integration**: Remote analysis capabilities

## Troubleshooting

### Common Issues

1. **No Opportunities Found**
   - Check file paths and permissions
   - Verify language configuration
   - Ensure files contain exportable functions

2. **Low Scores**
   - Functions may be too simple or complex
   - Missing documentation
   - No detectable patterns

3. **Analysis Errors**
   - Check TypeScript compilation
   - Verify file encodings
   - Review exclude patterns

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
import { logger } from '@context-pods/core';

logger.level = 'debug';
const results = await analyzer.analyze('./src');
```

## Contributing

When contributing to the analysis system:

1. **Add Tests**: All new parsers and patterns need comprehensive tests
2. **Update Documentation**: Keep this README current with changes
3. **Performance Testing**: Benchmark large codebases
4. **Language Support**: Follow the established parser patterns
5. **Error Handling**: Ensure graceful failure modes

## Related Documentation

- [Context-Pods Core Documentation](../README.md)
- [MCP Tool Development Guide](../../server/README.md)
- [Template System Documentation](../templates/README.md)
- [Validation Framework](../validation/README.md)
