# 🌌 My Gravito Inertia Vue App

A modern full-stack web application built with [Gravito](https://github.com/gravito-framework/gravito), Inertia.js, and Vue 3.

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
# In one terminal:
bun run dev
# In another terminal (for Vite HMR):
bun x vite src/client

# Start production server
bun run build
bun run start
```

## Project Structure

```
src/
├── index.ts           # App entry point
├── bootstrap.ts       # Framework initialization
├── app.ts             # App factory
├── routes/            # Route modules
├── controllers/       # Controller classes
├── client/            # Vue 3 Frontend
│   ├── app.ts         # Inertia entry point
│   ├── components/    # Reusable components
│   └── pages/         # Inertia page components
└── views/
    └── app.html       # Root HTML template
```

## License

MIT
