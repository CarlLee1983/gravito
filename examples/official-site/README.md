# 🌌 Gravito Official Website (v1.0.0-rc)
> **Singularity** Project Code: `gravito-official-site`

Welcome to the official website repository for **Gravito** - The micro-kernel framework for the next generation of backend applications.

This project serves as both the **production-ready official site** and the **flagship reference implementation** of the Gravito "Singularity" architecture.

---

## 🚀 Features & Architecture

This website demonstrates the full power of the Gravito ecosystem, specifically the **Micro-Monolith** pattern:

### 1. **Core Architecture** (`@gravito/core`)
- **Micro-Kernel**: Built on `gravito-core`, leveraging the lifecycle hook system for modularity.
- **Photon Adapter**: Utilizing `@gravito/photon` as the high-performance HTTP layer running on **Bun**.
- **Kinetic Modules**:
    - **@gravito/ion**: Seamless server-side routing with modern SPA user experience.
    - **@gravito/prism**: Server-side template rendering for critical SEO paths.
    - **@gravito/stasis**: Optimized caching strategies.

### 2. **Modern Frontend**
- **React + Inertia.js**: A hybrid approach delivering the speed of an SPA with the simplicity of a backend-driven app.
- **Vite**: Ultra-fast build tool handling HMR and static asset bundling.
- **TailwindCSS**: Utilitarian design system providing the "Cosmic" dark mode aesthetic.
- **Framer Motion**: High-performance animations (Hero effects, Feature cards).

### 3. **Documentation System**
- **Markdown-driven**: Documentation is sourced directly from the monorepo's `docs/` directory.
- **Smart Link Resolution**: Automated transformation of relative `.md` links into clean, routable web URLs.
- **Syntax Highlighting**: Powered by **Shiki** for beautiful code snippets.

### 4. **SEO & Performance**
- **Gravito SEO Engine**:
    - Dynamic **Robots.txt** & **Sitemap.xml** generation via `@gravito/luminosity-adapter-photon`.
    - No static files to maintain; routing rules are defined in code (`src/config/seo.ts`).
- **Image Optimization**:
    - Responsive WebP handling (`GravitoImage` component).
    - Pure SVG Tech Stack icons for zero-latency loading.
- **I18n**: Native support for English (`/en`) and Chinese (`/zh`) locales.

---

## 🛠️ Project Structure

```bash
examples/official-site/
├── src/
│   ├── bootstrap.ts       # App wiring (Core + Modules + Middleware)
│   ├── index.ts           # Entry point
│   ├── config/            # SEO, App configurations
│   ├── controllers/       # Backend logic (Home, Docs, API)
│   ├── services/          # Business logic (Markdown processing)
│   ├── routes/            # Route definitions
│   └── client/            # Frontend (React)
│       ├── pages/         # Inertia Page Components
│       ├── components/    # Shared UI Components
│       └── app.tsx        # Client entry point
├── static/                # Public assets (Images, Manifest)
├── vite.config.ts         # Build configuration
└── build-static.ts        # SSG Build Script
```

---

## ⚡ Quick Start

### Prerequisites
- **Bun** (v1.0+)
- **Node.js** (v18+ for some build tools, though Bun handles most)

### Development

```bash
# 1. Install dependencies (from root monorepo or project dir)
bun install

# 2. Start the development environment
# This launches both the Backend Server (Port 3000) and Vite HMR Server
bun run dev
```

Visit `http://localhost:3000` to see the site.

### Building for Production

```bash
# Build client-side assets
bun run build:client

# Start the production server
bun run start
```

### Static Site Generation (SSG)

This project also supports exporting to a static site (e.g. for GitHub Pages):

```bash
bun run build:static
```

---

## 🎨 Asset Optimization

### Tech Stack Icons
Gravito uses **Pure SVG Paths** for technology logos (Bun, Photon, TS) to ensure pixel-perfect rendering at any scale without external network requests.
See `TechIcon` component in `src/client/pages/Home.tsx`.

### Hero Images
Images are automatically served in responsive WebP formats:
- `hero-768w.webp`
- `hero-1280w.webp`
- `hero-2560w.webp`

---

## 📄 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
