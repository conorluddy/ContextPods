#!/usr/bin/env node

import { execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

console.log('🚀 Starting Context-Pods...\n');

// Create a temporary directory for the installation
const tempDir = mkdtempSync(join(tmpdir(), 'context-pods-'));

try {
  // Install the CLI and core packages in the temp directory
  console.log('📦 Installing Context-Pods CLI...');
  execSync(
    `npm install --prefix "${tempDir}" @context-pods/cli@latest @context-pods/core@latest @context-pods/templates@latest`,
    {
      stdio: 'inherit',
    },
  );

  // Get the CLI path
  const cliPath = join(tempDir, 'node_modules', '@context-pods', 'cli', 'bin', 'context-pods');

  // Forward all arguments to the actual CLI
  const args = process.argv
    .slice(2)
    .map((arg) => `"${arg}"`)
    .join(' ');

  // Set the templates path environment variable to the installed templates
  const templatesPath = join(tempDir, 'node_modules', '@context-pods', 'templates', 'templates');

  // Run the CLI with the forwarded arguments and proper environment
  execSync(`node "${cliPath}" ${args}`, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      CONTEXT_PODS_TEMPLATES_PATH: templatesPath,
    },
  });
} catch (error) {
  console.error('\n❌ Error running Context-Pods:', error.message);
  process.exit(1);
} finally {
  // Clean up the temporary directory
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch (cleanupError) {
    // Ignore cleanup errors
  }
}
