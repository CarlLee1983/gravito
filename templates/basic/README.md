# 🌌 My Gravito App

A lightweight, micro-kernel web application built with [Gravito](https://github.com/gravito-framework/gravito).

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development server (with hot reload)
bun run dev

# Run type checking
bun run typecheck

# Lint and format code
bun run lint
bun run format

# Build for production
bun run build

# Start production server
bun run start
```

## 📂 Project Structure

```
src/
├── index.ts           # App entry point (configure here)
├── bootstrap.ts       # Framework initialization
├── app.ts             # App factory & route composition
├── routes/            # Route modules
│   ├── home.ts        # Page routes
│   └── api.ts         # API routes
├── controllers/       # Controller classes (Logic)
├── hooks/             # Application hooks (Actions & Filters)
└── views/             # HTML templates (Orbit Prism)
```

## 🛠 Features

- **Micro-kernel Architecture**: Built on `PlanetCore` for ultimate modularity.
- **Orbit System**: Easy to extend with official or community Orbits.
- **TypeScript First**: Full type safety from backend to frontend.
- **Biome**: Pre-configured for lightning-fast linting and formatting.
- **Bun Optimized**: Native performance and modern developer workflow.

## 📄 License

MIT