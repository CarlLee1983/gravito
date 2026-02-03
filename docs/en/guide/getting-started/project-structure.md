---
title: Project Structure
description: Understanding the directory layout and architecture of a Gravito app.
---

# Project Structure

Gravito follows a predictable, clean directory structure. Developers familiar with MVC frameworks like Laravel will feel right at home, while also benefiting from optimizations for performance and modularity.

## Directory Layout (Enterprise MVC)

By default, Gravito scaffolds projects using the **Enterprise MVC** layout, which is suitable for most web applications:

```text
my-gravito-app/
├── config/              # Feature & Module configuration files
│   ├── app.ts           # Core application settings
│   ├── database.ts      # Database connection settings
│   └── auth.ts          # Authentication & Authorization settings
├── src/
│   ├── Http/            # HTTP Transport Layer
│   │   ├── Controllers/ # Controllers (Handle request logic)
│   │   ├── Middleware/  # Middleware (Filter requests)
│   │   └── Kernel.ts    # HTTP Kernel (Register global middleware)
│   ├── Models/          # Data Models (Atlas ORM)
│   ├── Services/        # Business Logic layer
│   ├── Providers/       # Service Providers
│   ├── Exceptions/      # Exception handling logic
│   ├── routes.ts        # Route definitions
│   └── bootstrap.ts     # Application bootstrapper
├── database/            # Database-related resources
│   ├── migrations/      # Database migrations
│   ├── factories/       # Model factories (Test data generation)
│   └── seeders/         # Database seeders
├── public/              # Static assets (images, robots.txt)
├── tests/               # Test cases (Unit & Feature)
├── gravito.config.ts    # Project root configuration
├── package.json
└── tsconfig.json
```

---

## Core Directories

### `config/`
Contains all your application's configuration files. Gravito encourages splitting configuration by feature into separate files to keep things organized.

### `src/Http/`
The entry point for handling web requests. `Controllers` receive input and return responses, while `Middleware` provides a convenient mechanism for filtering HTTP requests (e.g., authentication).

### `src/Models/`
Where your Atlas (ORM) models reside. Each model typically represents a single table in your database.

### `src/Providers/`
Service Providers are the "ignition points" for Gravito apps. They are responsible for binding services into the **IoC Container**, and registering middleware, event listeners, etc.

### `src/bootstrap.ts`
The file responsible for initializing `PlanetCore` and loading the necessary Orbits.

---

## Core Philosophy: Galaxy Architecture

Gravito utilizes a "Micro-kernel + Orbits" design pattern:

1.  **PlanetCore (Micro-kernel)**: Intentionally tiny, handling only the application lifecycle, IoC container, and Hook system.
2.  **Orbits (Modules)**: Features are added as pluggable modules. For example:
    *   Need a database? Add `@gravito/atlas`.
    *   Need authentication? Add `@gravito/sentinel`.
    *   Need task scheduling? Add `@gravito/horizon`.

This ensures "pay only for what you use" performance, meaning your app only runs the code it actually needs.

---

## The Lifecycle

When you run `gravito dev` or start the server:

1.  **Load Config**: The system reads files in `config/` and `gravito.config.ts`.
2.  **Register Providers**: Every Service Provider's `register()` method is executed, binding services to the container.
3.  **Boot Providers**: Every Service Provider's `boot()` method is executed once all services are registered and ready.
4.  **Routing**: HTTP requests hit the `Http/Kernel`, pass through middleware, and finally reach the designated Controller.

## Diverse Architectural Choices

The strength of Gravito lies in its flexibility. While the Enterprise MVC structure is the default recommendation, you can switch patterns based on your project's complexity:

- **Clean Architecture**: Strict dependency rules that decouple business logic from the framework.
- **Domain-Driven Design (DDD)**: Modular development suited for hyper-scale or complex domain logic.

> **Next Step**: If you need a different structure, check out the [Architectural Patterns & Scaffolding](./cli-init.md) guide.

