# Tool Implementation Examples

This example demonstrates how to create and use MCP tools with the TypeScript Advanced template.

## Features Demonstrated

- **Tool Definition** - Defining tools with JSON Schema validation
- **Input/Output Schemas** - TypeScript types with runtime validation
- **Error Handling** - Comprehensive error management
- **Testing** - Unit tests for tool functionality

## Example Tools

### 1. Calculator Tool
A simple mathematical calculator with operator validation.

### 2. Text Analyzer Tool  
Analyzes text for word count, sentiment, and readability.

### 3. Code Generator Tool
Generates code snippets in multiple languages.

## Running the Example

```bash
# From the template root directory
npm run example:tools

# Run with test client
node examples/tools/client-demo.js
```

## Key Concepts

- Tools are the primary way MCP servers expose functionality
- Each tool must have a name, description, and input schema
- Output schemas are optional but recommended for type safety
- Use Zod for runtime validation and type generation
- Always handle errors gracefully with meaningful messages

## Testing

```bash
# Run tool-specific tests
npm test -- tools

# Run integration tests
npm run test:integration
```