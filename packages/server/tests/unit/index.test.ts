/**
 * Smoke tests for @context-pods/server package
 * These tests verify the basic infrastructure and MCP server setup
 */

import { describe, it, expect } from 'vitest'

describe('Server Package', () => {
  it('should export main server functionality', async () => {
    // Test that the main server module can be imported
    const serverModule = await import('../../src/index')
    expect(serverModule).toBeDefined()
  })

  it('should have registry operations', async () => {
    const registry = await import('../../src/registry/operations')
    
    // Verify registry exports exist
    expect(registry).toBeDefined()
    expect(typeof registry.RegistryOperations).toBe('function')
    expect(typeof registry.getRegistryOperations).toBe('function')
  })

  it('should have MCP tools defined', async () => {
    const tools = await import('../../src/tools/index')
    
    // Verify tools exist
    expect(tools.CreateMCPTool).toBeDefined()
    expect(tools.WrapScriptTool).toBeDefined()
    expect(tools.ListMCPsTool).toBeDefined()
    expect(tools.ValidateMCPTool).toBeDefined()
  })
})