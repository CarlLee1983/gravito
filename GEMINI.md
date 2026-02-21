# GEMINI.md

## 🌌 Project Overview: Gravito Framework

Gravito is a modular, high-performance TypeScript framework built for the modern web, leveraging the **Galaxy Architecture**. It strictly enforces **Domain-Driven Design (DDD)** and **Clean Architecture** internally while providing a minimalist, **Manifest-Driven Development (MDD)** experience for developers.

### Core Architectural Pillars
- **PlanetCore (Micro-Kernel)**: A self-developed, ultra-lightweight engine managing hooks, IoC containers, and lifecycle events (`@gravito/core`).
- **Orbits (Infrastructure)**: Strategic extensions that provide essential resources like Database (Atlas ORM), Auth, and Messaging.
- **Satellites (Domain Plugins)**: Self-contained business units (Catalog, Membership, Commerce) that implement specific domains using Clean Architecture.

### Key Technologies
- **Runtime**: [Bun](https://bun.sh/) (Package manager, test runner, script execution).
- **Monorepo Management**: [TurboRepo](https://turbo.build/).
- **Linting & Formatting**: [Biome](https://biomejs.dev/).
- **Web Engines**: [Hono](https://hono.dev/) (via `@gravito/photon`), [Elysia](https://elysiajs.com/).
- **Data Layer**: Atlas ORM (`@gravito/atlas`).
- **Communication**: Signal Event Bus (`@gravito/signal`).

---

## 🛠️ Building and Running

The project is a monorepo managed by Bun and Turbo. Key commands are accessible from the root `package.json`.

| Task | Command | Description |
|---|---|---|
| **Build** | `bun run build` | Build all packages and satellites via Turbo. |
| **Test** | `bun run test` | Run all tests using Bun's native test runner. |
| **Typecheck** | `bun run typecheck` | Run TypeScript compiler in `noEmit` mode across the monorepo. |
| **Lint/Format** | `bun run check` | Run Biome lint and format checks. |
| **Fix Lint** | `bun run check:fix` | Automatically fix linting and formatting issues. |
| **Launchpad** | `bun run launchpad:up` | Start the Gravito Launchpad (Development Dashboard). |
| **CI Simulation**| `bun run ci:simulate` | Run local CI simulation to verify changes before pushing. |

---

## 📏 Development Conventions

### Code Style & Structure
- **Biome Defaults**: 100 char width, 2 space indentation, single quotes, no semicolons, trailing commas.
- **Strict TypeScript**: `noUnusedLocals` and `noUnusedParameters` are enabled and must be respected. Avoid `@ts-ignore` unless accompanied by an explanatory comment.
- **Monorepo Layout**:
  - `packages/`: Core framework packages (e.g., `core`, `atlas`, `photon`).
  - `satellites/`: Domain-specific business logic plugins (e.g., `catalog`, `membership`).
  - `examples/`: Reference implementations and verification projects.

### Architectural Rules
- **Satellite Isolation**: Satellites must NOT import from each other directly. Use the `@gravito/signal` event bus for cross-domain communication.
- **Clean Architecture**: Business logic should be decoupled from infrastructure.
- **Circular Dependencies**: Strictly forbidden. Use `bun run scripts/generate-dependency-graph.ts` to diagnose issues.

### Contribution Workflow
- **Changesets**: Use `bun run changeset` to document public package changes.
- **Commit Messages**: Follow conventional commits with package scope, e.g., `feat: [core] Add new hook type`.
- **Pre-push Hooks**: Automated checks for affected packages and circular dependencies.

---

## 📚 Reference Documentation
- **[README.md](./README.md)**: General project overview.
- **[AGENT.md](./AGENT.md)**: Comprehensive AI agent instructions and package maps.
- **[docs/README.md](./docs/README.md)**: Documentation hub and index.
- **[docs/claude/commands.md](./docs/claude/commands.md)**: Detailed CLI command reference.
- **[docs/TECH_HIGHLIGHTS.md](./docs/TECH_HIGHLIGHTS.md)**: Technical value propositions.
