# Release Process

This document describes the release process for Context-Pods packages.

## Overview

Context-Pods uses GitHub Releases to trigger automated npm publishing. When you create a GitHub release, the CI/CD pipeline automatically:

1. Builds all packages
2. Runs all tests
3. Updates package versions to match the release tag
4. Publishes all packages to npm
5. Updates the release notes with links to the published packages

## Prerequisites

Before creating a release:

1. Ensure you have push access to the main branch
2. Make sure all changes are merged to main
3. Verify CI is passing on main

## Release Steps

### 1. Prepare for Release

Run the release preparation script to validate everything is ready:

```bash
npm run release:prepare
```

This script will:

- Check that your working directory is clean
- Verify you're on the main branch
- Ensure all packages have the same version
- Pull latest changes from origin/main
- Run tests to ensure everything passes
- Build all packages

### 2. Update Package Versions

Decide on the new version number following [semantic versioning](https://semver.org/):

- PATCH version (0.0.x) for backwards-compatible bug fixes
- MINOR version (0.x.0) for backwards-compatible new features
- MAJOR version (x.0.0) for breaking changes

Update all package versions:

```bash
npm run release:version -- 0.0.3
```

### 3. Commit Version Changes

Review the changes and commit:

```bash
git add .
git commit -m "chore: bump version to 0.0.3"
git push origin main
```

### 4. Create GitHub Release

1. Go to [GitHub Releases](https://github.com/conorluddy/ContextPods/releases/new)
2. Click "Choose a tag" and create a new tag: `v0.0.3` (note the `v` prefix)
3. Target: `main` branch
4. Release title: `v0.0.3` (or a descriptive title)
5. Write release notes describing:
   - New features
   - Bug fixes
   - Breaking changes (if any)
   - Migration instructions (if needed)
6. Click "Publish release"

### 5. Monitor the Release

After publishing the release:

1. Check the [Actions tab](https://github.com/conorluddy/ContextPods/actions) to monitor the release workflow
2. The workflow will:
   - Build and test all packages
   - Publish to npm with the automation token
   - Update the release notes with links to published packages

### 6. Verify Publication

Once the workflow completes, verify the packages are published:

```bash
npm view @context-pods/core version
npm view @context-pods/cli version
npm view @context-pods/server version
npm view @context-pods/testing version
```

## Troubleshooting

### Release Workflow Fails

If the release workflow fails:

1. Check the workflow logs for specific errors
2. Common issues:
   - **NPM_TOKEN not set**: Ensure the NPM_TOKEN secret is configured in repository settings
   - **Version already exists**: npm won't republish existing versions
   - **Test failures**: Fix failing tests and create a new release

### Manual Publishing (Emergency Only)

If automated publishing fails and you need to publish manually:

1. Ensure you're on the release tag:

   ```bash
   git checkout v0.0.3
   ```

2. Install and build:

   ```bash
   npm ci
   npm run build
   ```

3. Publish each package:
   ```bash
   npm publish --workspace=@context-pods/core --access public
   npm publish --workspace=@context-pods/testing --access public
   npm publish --workspace=@context-pods/server --access public
   npm publish --workspace=@context-pods/cli --access public
   ```

## Setting Up NPM Automation Token

To enable automated publishing, you need to set up an npm automation token:

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to Access Tokens in your account settings
3. Generate a new token:
   - Type: "Automation"
   - Description: "Context-Pods GitHub Actions"
4. Copy the token
5. In your GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Create a new secret named `NPM_TOKEN`
   - Paste the npm token as the value

## Version Strategy

Context-Pods maintains version parity across all packages. This means:

- All packages share the same version number
- All packages are released together
- This simplifies dependency management and ensures compatibility

## Release Notes Template

When writing release notes, consider using this template:

```markdown
## What's Changed

### ✨ New Features

- Feature description (#PR)

### 🐛 Bug Fixes

- Fix description (#PR)

### 📚 Documentation

- Documentation updates (#PR)

### 🔧 Maintenance

- Internal improvements (#PR)

### ⚠️ Breaking Changes

- Description of breaking change
- Migration instructions

## Contributors

- @username

**Full Changelog**: https://github.com/conorluddy/ContextPods/compare/v0.0.2...v0.0.3
```
