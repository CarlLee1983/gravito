# Contributing to gravito

First off, thanks for taking the time to contribute! 🎉

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what you expected**
- **Include your environment details** (Node.js version, OS, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes (`bun test`)
4. Ensure TypeScript types pass (`bun run typecheck`)
5. Make sure your code lints (`bun run check`)
6. Issue that pull request!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/gravito.git
cd gravito

# Install dependencies
bun install

# Run tests
bun test

# Run typechecking
bun run typecheck

# Run linting
bun run check
```

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less

### TypeScript Styleguide

- Use Biome for formatting and linting
- Run `bun run check:fix` before committing

## Bun Development

Gravito leverages **Bun's advanced runtime features** for improved performance and developer experience. Here are key areas to understand:

### Runtime Features

- **Auto-install**: Dependencies can be imported directly without explicit package.json entries
- **File Types**: Support for `.toml`, `.yaml`, `.json5`, `.wasm`, and more
- **JSX Configuration**: Per-file JSX framework selection with `@jsxImportSource`
- **Plugins**: Extensible loader and resolver system for custom file types

For details, see:
- **[Bun Runtime Features Guide](./docs/bun/RUNTIME_FEATURES.md)** — Comprehensive feature reference
- **[Bun Quick Start](./docs/bun/QUICK_START.md)** — Common development tasks

### Plugin Development

Gravito provides a plugin system for extending Bun's build and runtime capabilities:

- **[Plugin Usage Guide](./docs/bun/PLUGIN_USAGE.md)** — Creating custom loaders and resolvers
- **[Built-in Plugins](./packages/luminosity-cli/src/plugins/)** — Example plugins for YAML, CSV, Markdown, and more

### File System Router

For static site generation and API route discovery, use the Astral File System Router:

- **[Astral Router Integration](./docs/bun/ASTRAL_ROUTER_INTEGRATION.md)** — Next.js-style routing patterns
- **Implementation**: `packages/astral/src/routing/`

### Verification

Before submitting a PR, ensure all Bun-specific features work correctly:

```bash
# Typecheck (validates all Bun APIs)
bun run typecheck

# Test (including Bun runtime tests)
bun test

# Lint (Biome checks Bun syntax)
bun run check
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
