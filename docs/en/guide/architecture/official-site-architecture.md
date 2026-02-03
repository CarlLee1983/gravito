# 🏗️ Official Site Architecture

The Gravito official website is not just a marketing page; it is a **flagship reference implementation** of the Gravito "Singularity" architecture. It demonstrates how to build a content-heavy, high-performance site using a **Micro-Monolith** approach.

---

## 🛰️ Architecture Overview

The site follows the Gravito Galaxy patterns, integrating multiple orbits to handle different concerns:

- **Core**: `@gravito/core` (PlanetCore) manages the application lifecycle.
- **Engine**: `@gravito/photon` provides high-speed I/O.
- **UI Bridge**: `@gravito/ion` (Inertia.js) connects the React frontend with the backend.
- **View Engine**: `@gravito/prism` handles server-side template rendering and SSG.
- **SEO Engine**: `@gravito/luminosity` manages sitemaps and metadata.

---

## 📝 The Markdown Pipeline

The documentation system is entirely data-driven, sourcing Markdown files directly from the monorepo root. This is handled by the `DocsService`.

### 1. File Resolution & Fallback
The service maps URLs to the filesystem. If a requested document is missing in the target locale (e.g., `zh-TW`), it automatically falls back to the English version to ensure no 404s for untranslated content.

### 2. Syntax Highlighting (Shiki)
We use **Shiki** instead of traditional client-side highlighters like Prism.js or Highlight.js.
- **Zero Client Runtime**: Code highlighting is performed on the server during the build/request phase.
- **Theme Consistency**: Uses the `rose-pine-moon` theme for a premium developer aesthetic.

### 3. Automatic Image Optimization
This is a key feature of the official site. The `DocsService` hooks into the Markdown parser's image renderer:

```typescript
renderer.image = ({ href, text }) => {
  // If it's a local path, use ImageService
  return imageService.generateImageTag({
    src: href,
    alt: text,
    usePicture: true,
    formatNegotiation: true,
  });
}
```

Every standard Markdown image `![alt](path)` is automatically converted into a high-performance `<picture>` tag with **WebP/AVIF** support and **CLS prevention**.

### 4. Dynamic Architecture Diagrams
Architecture diagrams in the docs are written using **Mermaid** syntax. The pipeline detects these blocks and renders them using `Mermaid.ink` with a custom Gravito color palette.

---

## 🔗 SPA Link Transformation

To maintain a seamless SPA experience, the `DocsService` transforms relative Markdown links (e.g., `[Routing](./routing.md)`) into proper localized SPA routes (e.g., `/en/docs/guide/routing`). This ensures that clicking a link in the documentation doesn't trigger a full page reload.

---

## 📊 Table of Contents (TOC) Generation

The pipeline automatically:
1.  Extracts all `H2` and `H3` headings.
2.  Generates unique, URL-friendly IDs (Slugify).
3.  Injects `scroll-mt-24` classes for correct offset when jumping to sections via the sidebar.
4.  Returns a structured `toc` array to the frontend for rendering the right sidebar.

---

## 🚀 SSG Export Logic

During `bun run build:static`, the `build-static.ts` script:
1.  Scans the `docs/` directory for all `.md` files.
2.  Generates a matrix of all localized paths.
3.  Feeds them into `ssg.exportIncremental()`.
4.  The output is a collection of hyper-optimized HTML files, ready for edge deployment.
