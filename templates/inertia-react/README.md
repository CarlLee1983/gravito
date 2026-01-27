# 🌌 My Gravito Inertia App

A modern full-stack web application built with [Gravito](https://github.com/gravito-framework/gravito), Inertia.js, and React.

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development server
# In one terminal:
bun run dev
# In another terminal (for Vite HMR):
bun x vite src/client

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
├── index.ts           # App entry point
├── bootstrap.ts       # Framework initialization
├── app.ts             # App factory
├── routes/            # Route modules
├── controllers/       # Controller classes
├── client/            # React Frontend
│   ├── app.tsx        # Inertia entry point
│   ├── components/    # Reusable components
│   └── pages/         # Inertia page components
└── views/
    └── app.html       # Root HTML template
```

## 🛠 Features

- **Inertia.js Integration**: The classic monolith feel with SPA speed.
- **Orbit System**: Modular plugin architecture.
- **Type-Safe API**: End-to-end type safety between server and client.
- **Vite & React**: Modern frontend development experience.
- **Biome**: Fast linting and formatting.

## 📄 License

MIT