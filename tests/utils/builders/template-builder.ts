/**
 * Test data builders for templates
 */

import type { TemplateMetadata, TemplateVariable } from '@context-pods/core'

/**
 * Builder for template metadata
 */
export class TemplateMetadataBuilder {
  private data: Partial<TemplateMetadata> = {}

  static create() {
    return new TemplateMetadataBuilder()
  }

  withName(name: string) {
    this.data.name = name
    return this
  }

  withDescription(description: string) {
    this.data.description = description
    return this
  }

  withLanguage(language: string) {
    this.data.language = language
    return this
  }

  withVersion(version: string) {
    this.data.version = version
    return this
  }

  withVariables(variables: TemplateVariable[]) {
    this.data.variables = variables
    return this
  }

  withOptimization(optimization: { turboRepo?: boolean; hotReload?: boolean }) {
    this.data.optimization = optimization
    return this
  }

  build(): TemplateMetadata {
    return {
      name: this.data.name || 'test-template',
      description: this.data.description || 'Test template',
      language: this.data.language || 'typescript',
      version: this.data.version || '1.0.0',
      variables: this.data.variables || [],
      optimization: this.data.optimization || { turboRepo: false, hotReload: false },
      ...this.data
    } as TemplateMetadata
  }
}

/**
 * Builder for template variables
 */
export class TemplateVariableBuilder {
  private data: Partial<TemplateVariable> = {}

  static create() {
    return new TemplateVariableBuilder()
  }

  withName(name: string) {
    this.data.name = name
    return this
  }

  withType(type: 'string' | 'number' | 'boolean' | 'array') {
    this.data.type = type
    return this
  }

  withDescription(description: string) {
    this.data.description = description
    return this
  }

  withDefault(defaultValue: any) {
    this.data.default = defaultValue
    return this
  }

  withRequired(required: boolean = true) {
    this.data.required = required
    return this
  }

  build(): TemplateVariable {
    return {
      name: this.data.name || 'testVar',
      type: this.data.type || 'string',
      description: this.data.description || 'Test variable',
      required: this.data.required ?? false,
      ...this.data
    } as TemplateVariable
  }
}

/**
 * Predefined template builders for common scenarios
 */
export const templateBuilder = {
  basic: () => TemplateMetadataBuilder.create()
    .withName('basic-template')
    .withDescription('Basic template')
    .withLanguage('typescript'),

  withVariables: (variables: TemplateVariable[]) => 
    templateBuilder.basic().withVariables(variables),

  typescript: () => TemplateMetadataBuilder.create()
    .withName('typescript-template')
    .withDescription('TypeScript template')
    .withLanguage('typescript')
    .withOptimization({ turboRepo: true, hotReload: true }),

  python: () => TemplateMetadataBuilder.create()
    .withName('python-template')
    .withDescription('Python template')
    .withLanguage('python')
    .withOptimization({ turboRepo: false, hotReload: false })
}

/**
 * Variable builders for common scenarios
 */
export const variableBuilder = {
  serverName: () => TemplateVariableBuilder.create()
    .withName('serverName')
    .withType('string')
    .withDescription('Name of the MCP server')
    .withRequired(true),

  serverDescription: () => TemplateVariableBuilder.create()
    .withName('serverDescription')
    .withType('string')
    .withDescription('Description of the MCP server')
    .withRequired(false)
    .withDefault('A MCP server'),

  tools: () => TemplateVariableBuilder.create()
    .withName('tools')
    .withType('array')
    .withDescription('List of tools to include')
    .withRequired(false)
    .withDefault([])
}