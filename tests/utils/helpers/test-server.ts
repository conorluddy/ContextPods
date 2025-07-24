/**
 * Test server utilities for E2E testing
 */

import { spawn, ChildProcess } from 'child_process'
import { createMockMCPClient } from '../mocks/mcp-client'

/**
 * Test MCP server wrapper for E2E tests
 */
export class TestMCPServer {
  private process: ChildProcess | null = null
  private port: number
  private client: ReturnType<typeof createMockMCPClient>

  constructor(port: number = 3000) {
    this.port = port
    this.client = createMockMCPClient()
  }

  /**
   * Start the test server
   */
  async start(serverPath: string, timeout: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn('node', [serverPath], {
        env: { ...process.env, PORT: this.port.toString() },
        stdio: 'pipe'
      })

      const timer = setTimeout(() => {
        reject(new Error(`Server failed to start within ${timeout}ms`))
      }, timeout)

      this.process.stdout?.on('data', (data) => {
        const output = data.toString()
        if (output.includes('Server started') || output.includes('listening')) {
          clearTimeout(timer)
          resolve()
        }
      })

      this.process.stderr?.on('data', (data) => {
        console.error('Server error:', data.toString())
      })

      this.process.on('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })

      this.process.on('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timer)
          reject(new Error(`Server exited with code ${code}`))
        }
      })
    })
  }

  /**
   * Stop the test server
   */
  async stop(): Promise<void> {
    if (this.process) {
      return new Promise((resolve) => {
        this.process!.on('exit', () => resolve())
        this.process!.kill('SIGTERM')
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL')
          }
        }, 5000)
      })
    }
  }

  /**
   * Connect MCP client to the server
   */
  async connect(): Promise<ReturnType<typeof createMockMCPClient>> {
    // In a real implementation, this would connect to the actual server
    // For testing, we return the mock client
    await this.client.connect()
    return this.client
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed
  }

  /**
   * Get server logs
   */
  getLogs(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.process) {
        resolve('')
        return
      }

      let logs = ''
      this.process.stdout?.on('data', (data) => {
        logs += data.toString()
      })
      this.process.stderr?.on('data', (data) => {
        logs += data.toString()
      })

      setTimeout(() => resolve(logs), 100)
    })
  }
}

/**
 * Create a test server instance
 */
export function createTestServer(port?: number): TestMCPServer {
  return new TestMCPServer(port)
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now()
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  throw new Error(`Condition not met within ${timeout}ms`)
}