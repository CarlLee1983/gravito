# Bun Runtime & Configuration Guides

Comprehensive documentation for using Bun with Gravito Core.

## Getting Started

- **[QUICK_START.md](./QUICK_START.md)** - Start here! Common tasks and examples
- **[RUNTIME_FEATURES.md](./RUNTIME_FEATURES.md)** - Detailed feature reference

## Configuration

- **[../bunfig.toml](../bunfig.toml)** - Runtime configuration file
- **tsconfig.json** - TypeScript compiler options

## Related Documentation

- **[BUN_CONFIG_REVIEW.md](../../BUN_CONFIG_REVIEW.md)** - Audit against Bun docs
- **[BUN_IMPROVEMENTS_PLAN.md](../../BUN_IMPROVEMENTS_PLAN.md)** - Implementation roadmap

## Quick Reference

### Supported File Types
- `.ts`, `.tsx` - TypeScript (auto-transpiled)
- `.js`, `.jsx` - JavaScript
- `.json`, `.toml`, `.yaml` - Configuration files
- `.html`, `.css` - Static assets
- `.wasm` - WebAssembly modules
- `.node` - Native addons (N-API)

### Common Commands
```bash
bun run <script.ts>      # Auto-install and run
bun test                 # Run tests
bun run build           # Build packages
bun run typecheck       # Type checking
```

### Import Patterns
```typescript
// Configuration
import config from "./app.toml" with { type: "toml" };

// JSX override (per-file)
// @jsxImportSource preact

// Auto-install specific version
import { z } from "zod@3.0.0";
```

## External Resources

- [Bun Official Documentation](https://bun.sh/docs)
- [File Types Support](https://bun.sh/docs/runtime/file-types)
- [File System Router](https://bun.sh/docs/runtime/file-system-router)
- [JSX Configuration](https://bun.sh/docs/runtime/jsx)
- [Auto-install Feature](https://bun.sh/docs/runtime/auto-install)
- [Plugin System](https://bun.sh/docs/runtime/plugins)

## Feedback

Found an issue or have a suggestion? Check the review and improvement documents for details on enhancing Bun support in Gravito.
