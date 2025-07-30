#!/usr/bin/env node

/**
 * Release preparation script for Context-Pods
 * 
 * This script:
 * 1. Validates that all packages have the same version
 * 2. Checks that the working directory is clean
 * 3. Ensures we're on the main branch
 * 4. Verifies tests pass
 * 5. Provides instructions for creating a release
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const PACKAGES = [
  '@context-pods/core',
  '@context-pods/testing',
  '@context-pods/server',
  '@context-pods/cli'
];

function getPackageVersion(packageName) {
  const packagePath = join(process.cwd(), 'packages', packageName.split('/')[1], 'package.json');
  if (!existsSync(packagePath)) {
    throw new Error(`Package not found: ${packagePath}`);
  }
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  return pkg.version;
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function checkGitStatus() {
  const status = execCommand('git status --porcelain');
  if (status.trim()) {
    throw new Error('Working directory is not clean. Please commit or stash changes.');
  }
}

function checkBranch() {
  const branch = execCommand('git branch --show-current').trim();
  if (branch !== 'main') {
    throw new Error(`You must be on the main branch to prepare a release. Current branch: ${branch}`);
  }
}

function checkVersionConsistency() {
  const versions = new Map();
  
  for (const pkg of PACKAGES) {
    const version = getPackageVersion(pkg);
    versions.set(pkg, version);
  }
  
  const uniqueVersions = new Set(versions.values());
  if (uniqueVersions.size > 1) {
    console.error('❌ Package versions are not consistent:');
    for (const [pkg, version] of versions) {
      console.error(`   ${pkg}: ${version}`);
    }
    throw new Error('All packages must have the same version before release');
  }
  
  return Array.from(uniqueVersions)[0];
}

async function main() {
  console.log('🚀 Preparing Context-Pods for release...\n');
  
  try {
    // Check git status
    console.log('📋 Checking git status...');
    checkGitStatus();
    console.log('✅ Working directory is clean\n');
    
    // Check branch
    console.log('🌿 Checking branch...');
    checkBranch();
    console.log('✅ On main branch\n');
    
    // Check version consistency
    console.log('🔢 Checking package versions...');
    const currentVersion = checkVersionConsistency();
    console.log(`✅ All packages at version: ${currentVersion}\n`);
    
    // Pull latest changes
    console.log('📥 Pulling latest changes...');
    execCommand('git pull origin main');
    console.log('✅ Up to date with origin/main\n');
    
    // Run tests
    console.log('🧪 Running tests...');
    execCommand('npm test', { stdio: 'inherit' });
    console.log('✅ All tests passed\n');
    
    // Build packages
    console.log('🔨 Building packages...');
    execCommand('npm run build', { stdio: 'inherit' });
    console.log('✅ Build successful\n');
    
    console.log('✨ Release preparation complete!\n');
    console.log('📝 Next steps:');
    console.log(`   1. Decide on the new version number (current: ${currentVersion})`);
    console.log('   2. Update all package versions:');
    console.log('      npm run release:version -- <new-version>');
    console.log('   3. Commit the version changes:');
    console.log('      git add . && git commit -m "chore: bump version to <new-version>"');
    console.log('   4. Push to main:');
    console.log('      git push origin main');
    console.log('   5. Create a GitHub release:');
    console.log('      - Go to https://github.com/conorluddy/ContextPods/releases/new');
    console.log('      - Create a new tag: v<new-version>');
    console.log('      - Target: main');
    console.log('      - Write release notes');
    console.log('      - Publish release\n');
    console.log('The GitHub Actions workflow will automatically publish to npm! 🎉');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);