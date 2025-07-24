/**
 * Smoke tests for @context-pods/core package
 * These tests verify the basic infrastructure and exports
 */

import { describe, it, expect } from 'vitest'

describe('Core Package', () => {
  it('should export main functions', async () => {
    const core = await import('../../src/index')
    
    // Verify basic exports exist
    expect(core).toBeDefined()
    expect(typeof core.DefaultTemplateEngine).toBe('function')
    expect(typeof core.TemplateSelector).toBe('function')
  })

  it('should export schemas', async () => {
    const schemas = await import('../../src/schemas')
    
    // Verify schemas exist
    expect(schemas.TemplateMetadataSchema).toBeDefined()
    expect(schemas.PodConfigSchema).toBeDefined()
    expect(schemas.MCPServerManifestSchema).toBeDefined()
  })

  it('should export logger', async () => {
    const { logger } = await import('../../src/logger')
    
    // Verify logger exists
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
  })
})