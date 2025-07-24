/**
 * Test data builders for server configurations
 */

/**
 * Server status enum for testing
 */
export enum ServerStatus {
  BUILDING = 'building',
  READY = 'ready',
  ERROR = 'error',
  STOPPED = 'stopped'
}

/**
 * Server configuration interface for testing
 */
export interface TestServerConfig {
  id: string
  name: string
  description: string
  language: string
  template: string
  status: ServerStatus
  createdAt: Date
  updatedAt: Date
  path?: string
  port?: number
  tools?: string[]
  resources?: string[]
}

/**
 * Builder for server configurations
 */
export class ServerConfigBuilder {
  private data: Partial<TestServerConfig> = {}

  static create() {
    return new ServerConfigBuilder()
  }

  withId(id: string) {
    this.data.id = id
    return this
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

  withTemplate(template: string) {
    this.data.template = template
    return this
  }

  withStatus(status: ServerStatus) {
    this.data.status = status
    return this
  }

  withPath(path: string) {
    this.data.path = path
    return this
  }

  withPort(port: number) {
    this.data.port = port
    return this
  }

  withTools(tools: string[]) {
    this.data.tools = tools
    return this
  }

  withResources(resources: string[]) {
    this.data.resources = resources
    return this
  }

  build(): TestServerConfig {
    const now = new Date()
    return {
      id: this.data.id || 'test-server-' + Date.now(),
      name: this.data.name || 'test-server',
      description: this.data.description || 'Test MCP server',
      language: this.data.language || 'typescript',
      template: this.data.template || 'basic',
      status: this.data.status || ServerStatus.READY,
      createdAt: this.data.createdAt || now,
      updatedAt: this.data.updatedAt || now,
      path: this.data.path,
      port: this.data.port,
      tools: this.data.tools || [],
      resources: this.data.resources || []
    }
  }
}

/**
 * Predefined server builders for common scenarios
 */
export const serverBuilder = {
  basic: () => ServerConfigBuilder.create()
    .withName('basic-server')
    .withDescription('Basic MCP server')
    .withLanguage('typescript')
    .withTemplate('basic')
    .withStatus(ServerStatus.READY),

  typescript: () => ServerConfigBuilder.create()
    .withName('typescript-server')
    .withDescription('TypeScript MCP server')
    .withLanguage('typescript')
    .withTemplate('typescript-advanced')
    .withStatus(ServerStatus.READY)
    .withTools(['file-operations', 'data-processing'])
    .withResources(['templates', 'configs']),

  python: () => ServerConfigBuilder.create()
    .withName('python-server')
    .withDescription('Python MCP server')
    .withLanguage('python')
    .withTemplate('python-basic')
    .withStatus(ServerStatus.READY)
    .withTools(['data-analysis', 'file-processing']),

  building: () => ServerConfigBuilder.create()
    .withName('building-server')
    .withStatus(ServerStatus.BUILDING),

  error: () => ServerConfigBuilder.create()
    .withName('error-server')
    .withStatus(ServerStatus.ERROR),

  withPort: (port: number) => ServerConfigBuilder.create()
    .withPort(port)
}