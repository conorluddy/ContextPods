/**
 * File system mocking utilities using memfs
 */

import { vol } from 'memfs'
import { vi } from 'vitest'

/**
 * Create a mock file system with initial structure
 */
export function createMockFileSystem(initialFiles: Record<string, string> = {}) {
  vol.reset()
  vol.fromJSON(initialFiles)
  
  return {
    vol,
    fs: vol.promises,
    reset: () => vol.reset(),
    addFile: (path: string, content: string) => vol.writeFileSync(path, content),
    getFile: (path: string) => {
      try {
        return vol.readFileSync(path, 'utf8')
      } catch {
        return null
      }
    },
    exists: (path: string) => vol.existsSync(path),
    mkdir: (path: string) => vol.mkdirSync(path, { recursive: true }),
    toJSON: () => vol.toJSON()
  }
}

/**
 * Reset all file system mocks
 */
export function resetFileSystemMocks() {
  vol.reset()
  vi.clearAllMocks()
}

/**
 * Mock fs/promises module for tests
 */
export function mockFsPromises() {
  return {
    readFile: vi.fn(async (path: string) => vol.readFileSync(path, 'utf8')),
    writeFile: vi.fn(async (path: string, data: string) => vol.writeFileSync(path, data)),
    mkdir: vi.fn(async (path: string, options?: any) => vol.mkdirSync(path, options)),
    access: vi.fn(async (path: string) => {
      if (!vol.existsSync(path)) throw new Error(`ENOENT: no such file or directory, access '${path}'`)
    }),
    stat: vi.fn(async (path: string) => {
      const stats = vol.statSync(path)
      return {
        ...stats,
        isDirectory: () => stats.isDirectory(),
        isFile: () => stats.isFile()
      }
    }),
    readdir: vi.fn(async (path: string) => vol.readdirSync(path)),
    copyFile: vi.fn(async (src: string, dest: string) => {
      const content = vol.readFileSync(src)
      vol.writeFileSync(dest, content)
    }),
    rmdir: vi.fn(async (path: string, options?: any) => vol.rmSync(path, options)),
    unlink: vi.fn(async (path: string) => vol.unlinkSync(path))
  }
}