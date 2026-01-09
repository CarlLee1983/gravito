# NPM Publishing Guide for @gravito/quasar v1.1.0

## Pre-publish Checklist

- ✅ Version bumped to 1.1.0
- ✅ CHANGELOG.md updated with release date
- ✅ README.md complete with examples
- ✅ All tests passing (11/11)
- ✅ TypeScript typecheck passing
- ✅ Linting passing
- ✅ package.json metadata complete

## Publishing Steps

### 1. Merge to Main Branch

```bash
# Switch to main
git checkout main

# Merge feature branch
git merge feat/queue-probes

# Push to remote
git push origin main
```

### 2. Verify Package Contents

```bash
cd packages/quasar

# Check what will be published
npm pack --dry-run

# Expected files:
# - src/ (all TypeScript source files)
# - README.md
# - CHANGELOG.md
# - BRIDGES.md
# - package.json
```

### 3. Build (if needed)

Since this package uses TypeScript source directly (`"main": "src/index.ts"`), no build step is required. Users will compile it themselves or use it with Bun/ts-node.

If you want to publish compiled JavaScript:
```bash
# Add build script to package.json
"scripts": {
  "build": "tsc",
  "prepublishOnly": "npm run build"
}

# Update main field
"main": "dist/index.js",
"types": "dist/index.d.ts",
```

### 4. Login to npm

```bash
npm login
# Enter your npm credentials
```

### 5. Publish to npm

```bash
cd packages/quasar

# Dry run first (recommended)
npm publish --dry-run

# Publish for real
npm publish --access public

# Or if using a tag (e.g., beta)
npm publish --access public --tag beta
```

### 6. Verify Publication

```bash
# Check on npm
npm view @gravito/quasar

# Install in a test project
npm install @gravito/quasar@1.1.0
```

### 7. Create Git Tag

```bash
cd /Users/carl/Dev/Carl/gravito-core

# Create annotated tag
git tag -a quasar-v1.1.0 -m "Release @gravito/quasar v1.1.0

- Add BullMQ and Bee-Queue probe support
- Add real-time job tracking bridges
- Complete documentation"

# Push tag
git push origin quasar-v1.1.0
```

## Post-publish

### Update GitHub Release

1. Go to https://github.com/gravito-framework/gravito-core/releases
2. Click "Draft a new release"
3. Select tag: `quasar-v1.1.0`
4. Title: `@gravito/quasar v1.1.0`
5. Description: Copy from CHANGELOG.md

### Announce

- Update main project README if needed
- Notify users in Discord/Slack
- Update documentation site

## Troubleshooting

### "Package already exists"
```bash
# Check current version on npm
npm view @gravito/quasar version

# If 1.1.0 already exists, bump to 1.1.1
npm version patch
git add package.json
git commit -m "chore: bump to 1.1.1"
```

### "Not authorized"
```bash
# Make sure you're logged in
npm whoami

# Check package access
npm access ls-packages
```

### "Files not included"
```bash
# Check .npmignore or package.json "files" field
# Make sure all necessary files are included
```

## Version Strategy

- **Patch (1.1.x)**: Bug fixes, documentation updates
- **Minor (1.x.0)**: New features (backward compatible)
- **Major (x.0.0)**: Breaking changes

Current release: **1.1.0** (Minor - new features: Probes + Bridges)
