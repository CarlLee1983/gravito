# Gravito Framework 🌌

Gravito is a modular, high-performance TypeScript framework built for the modern web. It leverages the **Galaxy Architecture**—a unique approach inspired by celestial mechanics to manage lifecycle, extensions (Orbits), and domain-specific plugins (Satellites).

👉 **[Discover our Technical Highlights & Value Propositions](./docs/TECH_HIGHLIGHTS.md)**

> **Version 1.0 is here!** Build complex e-commerce systems by simply composing modules.

---

## 🌟 The Galaxy Architecture

Gravito is built on the principle of **"Rigorous Core, Flexible Perimeter."** It strictly enforces **DDD (Domain-Driven Design)** and **Clean Architecture** internally while providing a minimalist experience for developers.

- **Micro-Kernel (PlanetCore)**: A self-developed, ultra-lightweight engine that manages hooks and lifecycle events.
- **Orbits (Infrastructure)**: Strategic extensions (Database, Auth, Messaging) that "orbit" the core, providing essential resources.
- **Satellites (Domain Plugins)**: Self-contained business units (Catalog, Cart, Payment) that implement specific domains using Clean Architecture.

---

## 🚀 E-Commerce 1.0: Manifest-Driven Assembly

The 1.0 release introduces **"MDD" (Manifest-Driven Development)**. You can now assemble a full-featured e-commerce site by simply declaring what you need.

### The "Three-File" Rule
1. **`package.json`**: Add your satellites.
2. **`gravito.config.ts`**: Declare your features.
3. **`entry-server.ts`**: One line to ignite the entire ecosystem.

### Example Configuration
```typescript
// gravito.config.ts
export default {
  name: 'Flagship Store',
  modules: [
    'catalog',    // Products & Variants
    'membership', // Auth & User Profiles
    'analytics',  // Data & Charts
    'support',    // Real-time Chat
    'cms'         // News & Announcements
  ]
};
```

---

## 📦 Core Ecosystem

Gravito provides a rich set of official modules designed to work together seamlessly:

### Foundation Layer
| Package | Module | Description |
|---|---|---|
| `@gravito/core` | **PlanetCore** | The micro-kernel with Hooks & IoC Container. |
| `@gravito/photon` | **Photon** | High-performance HTTP engine (Hono-based). |
| `@gravito/atlas` | **Atlas** | Advanced ORM with migrations & Active Record. |
| `@gravito/signal` | **Signal** | The central Event Bus for cross-module events. |

### Domain Satellites (Business Logic)
| Package | Domain | Feature |
|---|---|---|
| `@gravito/satellite-catalog` | **Catalog** | Product management, categories, and inventory. |
| `@gravito/satellite-membership`| **Membership**| Multi-guard Auth, Roles, and CRM. |
| `@gravito/satellite-commerce` | **Order** | Order processing and lifecycle. |
| `@gravito/satellite-analytics` | **Analytics** | Pluggable dashboard widgets & data resolvers. |
| `@gravito/satellite-support` | **Support** | Real-time WebSocket customer service. |

### Frontend & UI
| Package | Component | Description |
|---|---|---|
| `@gravito/admin-shell-react` | **Admin Shell**| A pluggable React dashboard that auto-mounts modules. |
| `@gravito/support-chat-widget`| **Chat Widget** | A drop-in client widget for customer support. |
| `@gravito/prism` | **Prism** | Edge-optimized View Engine & Image Optimization. |

---

## 🛠️ Getting Started

### Installation
```bash
# In your monorepo or project
bun add @gravito/core @gravito/photon @gravito/monolith
```

### Development
For a full-stack integrated example, check out:
- [Commerce Fullstack Example](./examples/commerce-fullstack)
- [2.0 Integration Guide](./docs/spec/GUIDE_2.0_INTEGRATION.md)

---

## 📚 Example Projects

Learn by doing with our comprehensive examples:

| Example | Description | Key Concepts |
|---------|-------------|--------------|
| **[Atlas Site](./examples/atlas-site)** | ORM showcase with SQLite, Redis & MongoDB | Database Models, Migrations, Query Builder, Vue 3 Frontend |
| **[Commerce Fullstack](./examples/commerce-fullstack)** | Complete e-commerce platform | Domain Satellites, Event Bus, Order Processing, CMS |
| **[Blog MVC](./examples/blog-mvc)** | Classic MVC blog application | RESTful API, Template Rendering, Authentication |
| **[Event Registration](./examples/event-registration-mvc)** | Event booking & ticketing system | Clean Architecture, DDD, Event-Driven Design |
| **[Flash Sale](./examples/flash-sale-fullstack)** | High-concurrency sales platform | Real-time Updates, Inventory Management, WebSocket |
| **[E-Commerce MVC](./examples/ecommerce-mvc)** | Full-featured e-shop | Catalog, Cart, Payment Integration, Lifecycle Events |

**Quick start an example:**
```bash
cd examples/{example-name}
bun install
bun run dev      # Start development server
bun run build    # Production build
```

---

## ⚡ Performance: Built for Bun

Gravito is optimized for **Bun** runtime with native APIs that deliver **27-46% framework-level performance improvement**:

- **Zero-Copy File I/O**: Automatic detection and utilization of Bun's native `Bun.file().text()`, `Bun.file().json()`, and `Bun.write()` APIs
- **Non-Blocking Async**: All file operations are non-blocking, preventing event loop blocking during SSG, API documentation generation, and sitemap creation
- **FileSink Buffering**: High-frequency write operations (logs, traces) use buffered writes, reducing syscalls by 40-60%
- **Cross-Runtime Compatible**: Automatically falls back to Node.js/Deno when needed—no code changes required

📖 **[See detailed optimization analysis](./docs/optimization/OPTIMIZATION_SUMMARY.md)** (Phase 1-4 complete, Phase 5 Audit ongoing)

---

## 🤝 Community & Support

- **Documentation**: [docs/README.md](./docs/README.md)
- **Bun Runtime Guides**: [docs/bun/README.md](./docs/bun/README.md) — Learn Bun integration, plugins, and file system router
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **License**: MIT © Carl Lee

---

*(繁體中文說明已整合至各模組文件與 [整合指南](./docs/spec/GUIDE_2.0_INTEGRATION.md))*