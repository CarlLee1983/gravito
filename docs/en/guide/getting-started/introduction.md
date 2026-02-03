---
title: Introduction
description: Understand Gravito's core ideas, architecture, and why it fits modern full-stack teams.
---

# Introduction

> **Gravito** is a planet-scale, high-performance framework designed for modern developers. Built on Bun, it blends Laravel's artistic development experience with the extreme extensibility of the **Galaxy Architecture**.

## What is Gravito?

Gravito is more than just a web framework; it is your **full-stack gravitational field**. In the JavaScript/TypeScript ecosystem, developers often face fragmented toolchain choices. Gravito aims to provide a **batteries-included** experience similar to **Laravel**, while leveraging the millisecond startup and native high performance of **Bun**.

- **Galaxy Architecture**:
  - **PlanetCore (Core)**: An ultra-lightweight micro-kernel responsible for lifecycle and hook management.
  - **Orbits (Infrastructure)**: Strategic infrastructure modules orbiting the core (e.g., Atlas for Database, Signal for Events/Mail, Ion for Frontend Bridge).
  - **Satellites (Satellites)**: Self-contained business domain modules (e.g., Catalog, Membership) implemented using DDD and Clean Architecture.

## Why Choose Gravito?

### 1. Evolved Developer Experience (DX)
If you love Laravel, Ruby on Rails, or Django, you'll find Gravito's API extremely welcoming. We advocate for **Manifest-Driven Development (MDD)**, allowing you to assemble complex systems simply through `gravito.config.ts`.

### 2. Sustainable High Performance
Powered by the [Bun](https://bun.sh/) runtime, Gravito maintains extremely low memory overhead and astonishing request processing speeds. This means your servers can handle more concurrency while significantly reducing cloud computing costs.

### 3. Three-Dimensional Frontend Development
Gravito is **"Frontend Agnostic"**. We provide built-in support for three major application architectures:
- **Modern Monolith (Orbit Ion)**: Combine React or Vue (Inertia.js) for fluid SPA experiences without the need to develop complex APIs.
- **Classic MPA (Orbit Prism)**: High-performance server-side rendering for perfect SEO and developer intuition.
- **Static Site Generation (SSG)**: One-click "freeze" your application into a static site, suitable for deployment to GitHub Pages or Vercel.

### 4. Enterprise-Grade Extensibility
While the core is lightweight, you can easily add caching, queues, internationalization (I18n), SEO automation, and more through the **Orbits system**.

## Gravito vs Others

- **vs NestJS**: Gravito emphasizes convention over configuration with less boilerplate and decorator overhead.
- **vs Hono**: Hono is a great micro-framework; Gravito sits above it as a full-stack system with governance for data and architecture.
- **vs Laravel**: Gravito keeps Laravel's spirit with TypeScript safety and async-native performance.

---

## Next Steps
Ready to start? Head to the [Installation Guide](./installation.md) to create your first project.
