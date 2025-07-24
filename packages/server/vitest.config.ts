import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from '../../vitest.config'

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: ['../../tests/setup.ts'],
      coverage: {
        thresholds: {
          lines: 0,      // Will increase per checkpoint
          functions: 0,
          branches: 0,
          statements: 0
        }
      }
    }
  })
)