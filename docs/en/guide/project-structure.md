---
title: Project Structure
description: Understanding the directory layout and architecture of a Gravito app.
---

# Project Structure

Gravito follows a predictive, clean directory structure that feels familiar to MVC developers but is optimized for the Gravito Ecosystem.

## Directory Layout

Here is a look at a standard Gravito project (using the Inertia-React template):

```text
my-gravito-app/
├── src/
│   ├── client/          # Frontend assets & React components
│   │   ├── components/  # Shared React components
│   │   └── pages/       # Inertia Page components (mapped to Controllers)
│   ├── controllers/     # MVC Controllers (Business logic)
│   ├── locales/         # Translation files (I18n)
│   ├── routes/          # Route definitions (Gravito Router)
│   ├── services/        # Service layer (Database, External APIs)
│   ├── bootstrap.ts     # The App "Ignition" (Gravito registration)
│   └── index.ts         # Main Bun entry point
├── public/              # Static assets (images, robots.txt)
├── docs/                # Project documentation
├── gravito.config.ts    # Framework configuration
└── package.json
```

---

## The Core Philosophy: Planets & Kinetic Modules

To understand how Gravito works, you need to understand two concepts:

### 1. PlanetCore (The Micro-Kernel)
The core of Gravito is intentionally tiny. It doesn't know how to render React, it doesn't know how to talk to a database. It only knows how to manage the **Lifecycle** and the **Service Container**.

### 2. Kinetic Modules (Infrastructure)
Functionalities are added as "Kinetic Modules" that revolve around the core. 
- Want React? Add **Ion**.
- Want Vue? Add **Ion**.
- Want HTML? Add **Prism**.
- Want SEO? Add **Luminosity**.
- Need a Database? Add **Atlas** (not available in v1.0).

This "Pay only for what you use" approach ensures your application remains lightning-fast regardless of its scale.

---

## The Lifecycle

When you run `bun dev` or `bun run src/index.ts`, the following happens:

1. **Ignition (`index.ts`)**: The Bun runtime starts and calls `bootstrap()`.
2. **Registration (`bootstrap.ts`)**: All necessary Kinetic Modules are registered. 
   ```typescript
   core.orbit(GravitoInertia)
   core.orbit(GravitoView)
   ```
3. **Booting**: The kernel calls `boot()` on every Gravito, preparing services like the View engine or DB connections.
4. **Liftoff**: The HTTP engine starts listening for requests.

## Where to find code?

- **Routing**: Look in `src/routes/index.ts`. This is where you map URLs to Controllers.
- **Logic**: Look in `src/controllers/`. This is where the "Brain" of your app lives.
- **UI**: Look in `src/client/pages/`. This is where you build your visual experience.

> **Next Step**: Learn how to handle requests in the [Routing System](/docs/guide/routing).
