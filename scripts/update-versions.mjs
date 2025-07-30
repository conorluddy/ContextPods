#!/usr/bin/env node

/**
 * Version update script for Context-Pods
 * Updates all package versions consistently
 */

import { execSync } from 'child_process';

const version = process.argv[2];

if (!version) {
  console.error('❌ Error: Version argument required');
  console.error('Usage: npm run release:version -- <version>');
  console.error('Example: npm run release:version -- 0.0.3');
  process.exit(1);
}

// Validate version format
const versionRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
if (!versionRegex.test(version)) {
  console.error(`❌ Error: Invalid version format: ${version}`);
  console.error('Version must follow semantic versioning (e.g., 1.2.3 or 1.2.3-beta.1)');
  process.exit(1);
}

console.log(`📦 Updating all packages to version ${version}...\n`);

try {
  // Update workspace packages
  console.log('Updating workspace packages...');
  execSync(`npm version ${version} --workspaces --no-git-tag-version`, {
    stdio: 'inherit'
  });
  
  // Update root package.json
  console.log('\nUpdating root package.json...');
  execSync(`npm version ${version} --no-git-tag-version`, {
    stdio: 'inherit'
  });
  
  console.log(`\n✅ Successfully updated all packages to version ${version}`);
  console.log('\n📝 Next steps:');
  console.log('   1. Review the changes: git diff');
  console.log('   2. Commit: git add . && git commit -m "chore: bump version to ' + version + '"');
  console.log('   3. Push: git push origin main');
  console.log('   4. Create GitHub release with tag: v' + version);
  
} catch (error) {
  console.error(`\n❌ Error updating versions: ${error.message}`);
  process.exit(1);
}