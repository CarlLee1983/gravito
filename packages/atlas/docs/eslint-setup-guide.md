# ESLint Setup Guide for @gravito/atlas

Quick guide to enable SQL safety checks in your project.

## Installation

```bash
bun add -D @gravito/eslint-plugin-atlas
```

## Quick Setup (30 seconds)

### For New Projects

Create `eslint.config.js`:

```javascript
import atlas from '@gravito/eslint-plugin-atlas'

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '.next/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      atlas,
    },
    rules: {
      'atlas/no-unsafe-raw': 'warn',
      'atlas/sql-injection-risk': 'error',
    },
  },
]
```

### For Existing Projects

Add to your existing ESLint config:

```javascript
// eslint.config.js
import atlas from '@gravito/eslint-plugin-atlas'

export default [
  // ... your existing config
  {
    plugins: {
      atlas,
    },
    rules: {
      'atlas/no-unsafe-raw': 'warn',
      'atlas/sql-injection-risk': 'error',
    },
  },
]
```

## Configuration Levels

### Default (Recommended)

```javascript
rules: {
  'atlas/no-unsafe-raw': 'warn',
  'atlas/sql-injection-risk': 'error',
}
```

### Strict Mode (Security-Focused)

```javascript
rules: {
  'atlas/no-unsafe-raw': 'error',
  'atlas/sql-injection-risk': 'error',
}
```

### Lenient (Migration Period)

```javascript
rules: {
  'atlas/no-unsafe-raw': 'off',
  'atlas/sql-injection-risk': 'error',
}
```

## Add NPM Scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "lint:atlas": "eslint . --rule 'atlas/*: error'"
  }
}
```

## Usage

```bash
# Check all files
bun run lint

# Fix auto-fixable issues
bun run lint:fix

# Run only Atlas rules
bun run lint:atlas
```

## IDE Integration

### VS Code

1. Install "ESLint" extension
2. Auto-fix on save:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

### Other IDEs

Most modern IDEs support ESLint. Refer to:
- WebStorm/IntelliJ: Built-in ESLint support
- Vim/Neovim: See vim-lsp-settings
- Emacs: See flycheck-eslint

## Pre-commit Hook

Use husky to run ESLint before commits:

```bash
bun add -D husky lint-staged

npx husky install
npx husky add .husky/pre-commit "bun lint-staged"
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix"],
    "*.{js,jsx}": ["eslint --fix"]
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
```

### GitLab CI

```yaml
lint:
  image: oven/bun
  script:
    - bun install
    - bun run lint
```

## Troubleshooting

### Rules not working

1. Check plugin is listed in `plugins`
2. Verify rule names: `atlas/no-unsafe-raw` (not just `no-unsafe-raw`)
3. Ensure `eslint.config.js` is in project root
4. Clear ESLint cache: `bun eslint --cache-location /dev/null .`

### Too many false positives

1. Use `allowLiterals: true` in `no-unsafe-raw` config
2. Disable rule for specific lines with `// eslint-disable-next-line atlas/...`
3. Check rule documentation for configuration options

### Performance issues

1. Limit file scope in config
2. Consider excluding large generated files
3. Run linting in CI only for full checks

## See Also

- [ESLint Rules Documentation](./eslint-rules.md)
- [Safe Queries Guide](./safe-queries.md)
- [CONTRIBUTING.md - Security Best Practices](../CONTRIBUTING.md#security-best-practices)
