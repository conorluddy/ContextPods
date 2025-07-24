/**
 * Smoke tests for @context-pods/cli package
 * These tests verify the basic CLI infrastructure
 */

import { describe, it, expect } from 'vitest'

describe('CLI Package', () => {
  it('should export CLI functionality', async () => {
    // Test that the main CLI module can be imported
    const cliModule = await import('../../src/cli')
    expect(cliModule).toBeDefined()
  })

  it('should have command definitions', async () => {
    const generateCmd = await import('../../src/commands/generate')
    const wrapCmd = await import('../../src/commands/wrap')
    const listCmd = await import('../../src/commands/list')
    const templatesCmd = await import('../../src/commands/templates')
    const buildCmd = await import('../../src/commands/build')
    
    // Verify command exports exist
    expect(generateCmd.generateCommand).toBeDefined()
    expect(wrapCmd.wrapCommand).toBeDefined()
    expect(listCmd.listCommand).toBeDefined()
    expect(templatesCmd.templatesCommand).toBeDefined()
    expect(buildCmd.buildCommand).toBeDefined()
  })

  it('should have utility functions', async () => {
    const outputFormatter = await import('../../src/utils/output-formatter')
    const cacheManager = await import('../../src/utils/cache-manager')
    const turboIntegration = await import('../../src/utils/turbo-integration')
    
    // Verify utilities exist
    expect(outputFormatter).toBeDefined()
    expect(cacheManager).toBeDefined()
    expect(turboIntegration).toBeDefined()
  })
})