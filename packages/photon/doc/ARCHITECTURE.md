# Photon Architecture

Photon is designed to be the high-performance HTTP engine of the Gravito Galaxy Architecture. It provides the "Photon" (light speed) layer that handles all incoming networking requests.

## Core Design Principles

1. **Bun Native**: Optimized for the Bun runtime, utilizing its high-performance `Serve` API.
2. **Satellite Ready**: Built to be consumed by Gravito satellites and orbits with zero friction.
3. **Type-Safety First**: Leveraging TypeScript's advanced inference to provide a "no-guesswork" developer experience.

## Relationship with Hono

Photon is built on top of [Hono](https://hono.dev/).
- **Why Hono?**: Hono is the fastest cross-runtime framework with the best TypeScript support.
- **Why Photon?**: Photon adds Gravito-specific optimizations, domain-specific middleware (like HTMX and Binary/CBOR), and deep integration with the `@gravito/core` lifecycle and IoC container.

## Stack Diagram

```mermaid
graph TD
    User([User Request]) --> B(Bun Runtime)
    B --> P(Photon Engine)
    subgraph Photon Layer
        P --> R(Router)
        R --> M(Middleware Pipeline)
        M --> H(Hander)
    end
    H --> C(Gravito Core / Orbits)
```

## Internal Modules

- `Context`: Wraps the standard Request/Response.
- `Router`: High-speed Radix Tree based routing.
- `Adapters`: Specialized logic for different deployment targets (Bun, Node, etc.).

---

[← Back to README](../README.md)
