---
title: Introduction
description: Understand Gravito's core ideas, architecture, and why it fits modern full-stack teams.
---

# Introduction

> **Gravito** (from Gravity) is a Bun-native, planet-scale full-stack framework. It blends Laravel-style developer experience with the performance profile of modern JavaScript runtimes.

## What is Gravito?

Gravito is not just another web framework. It is a **full-stack gravitational field** for your application. In the JavaScript/TypeScript ecosystem, toolchains are often fragmented. Gravito aims to deliver a **batteries-included** experience similar to Laravel, while leveraging **Bun** for fast startup and high throughput.

- **Orbits (Modules)**: Official modules that orbit the core (Atlas for database, Sentinel for security). You can attach or detach them as your product grows.

## Why Gravito?

### 1. Evolved Developer Experience
If you enjoy Laravel, Ruby on Rails, or Django, Gravito will feel familiar. Routing, controller injection, and query tooling are designed to be clean and direct.
For a concrete breakdown, see [Better Than Laravel: Five DX Pillars](./dx-pillars.md).

### 2. Sustainable Performance
Powered by [Bun](https://bun.sh/), Gravito keeps memory overhead low and request throughput high. That means more concurrency with less infrastructure cost.

### 3. Three Frontend Paths
Gravito is **frontend agnostic**. You can mix and match modes by page:
- **Modern SPA (Inertia.js)**: React or Vue with SPA UX, without API overhead.
- **Classic MPA (Template Engine)**: SSR-friendly rendering for SEO-first pages.
- **Static Generation (SSG)**: Freeze a site into static files for GitHub Pages or Vercel.

### 4. Enterprise-Ready Expansion
The core stays lean, while **Kinetic modules** let you add caching, queues, i18n, SEO automation, and more when needed.

## Gravito vs Others

- **vs NestJS**: Gravito emphasizes convention over configuration with less boilerplate and decorator overhead.
- **vs Hono**: Hono is a great micro-framework; Gravito sits above it as a full-stack system with governance for data and architecture.
- **vs Laravel**: Gravito keeps Laravel's spirit with TypeScript safety and async-native performance.

---

## Next Steps
Ready to start? Head to the [Installation Guide](./installation.md) to create your first project.
