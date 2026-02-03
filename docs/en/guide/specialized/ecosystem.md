---
title: Kinetic Ecosystem
description: Explore Gravito's Kinetic Modules, from database to real-time communication support.
---

# Galaxy Ecosystem

Gravito is a vast galaxy composed of **PlanetCore (Micro-kernel)**, **Orbits (Infrastructure)**, and **Satellites (Domain)**. These components are highly decoupled, allowing you to freely combine them via `gravito.config.ts`.

---

<div class="not-prose space-y-12">

## Core Engines
<div class="ecosystem-grid">
  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">KERNEL</span>
    <h3 class="module-title">PlanetCore</h3>
    <code class="module-pkg">@gravito/core</code>
    <p class="module-desc">The gravitational center. An ultra-lightweight IoC container and lifecycle manager that hosts all kinetic modules.</p>
  </div>
  
  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">PHOTON</span>
    <h3 class="module-title">Photon HTTP</h3>
    <code class="module-pkg">@gravito/photon</code>
    <p class="module-desc">High-performance HTTP engine. Engineered for ultra-low latency request handling with zero abstraction overhead.</p>
  </div>

  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">PULSE</span>
    <h3 class="module-title">Pulse CLI</h3>
    <code class="module-pkg">@gravito/pulse</code>
    <p class="module-desc">The developer's heartbeat. A high-efficiency CLI tool powered by Bun, handling everything from scaffolding to migrations.</p>
  </div>
</div>

## Infrastructure Orbits
<div class="ecosystem-grid">
  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">ATLAS</span>
    <h3 class="module-title">Atlas ORM</h3>
    <code class="module-pkg">@gravito/atlas</code>
    <p class="module-desc">Physical form of data. Enterprise ORM supporting Active Record patterns and native Bun.sql performance.</p>
  </div>

  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">SIGNAL</span>
    <h3 class="module-title">Signal</h3>
    <code class="module-pkg">@gravito/signal</code>
    <p class="module-desc">Strategic communication. Integrates the central Event Bus with a professional mail delivery system.</p>
  </div>

  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">STREAM</span>
    <h3 class="module-title">Stream Queue</h3>
    <code class="module-pkg">@gravito/stream</code>
    <p class="module-desc">High-performance job queues with multi-driver support (Redis, SQS, etc.).</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">ION</span>
    <h3 class="module-title">Ion Bridge</h3>
    <code class="module-pkg">@gravito/ion</code>
    <p class="module-desc">Momentum transfer. A full-stack bridge (Inertia) that dissolves the boundary between frontend and backend.</p>
  </div>
</div>

## Domain Satellites
<div class="ecosystem-grid">
  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">CATALOG</span>
    <h3 class="module-title">Catalog</h3>
    <code class="module-pkg">@gravito/satellite-catalog</code>
    <p class="module-desc">Product management, categories, and inventory management.</p>
  </div>

  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">MEMBERSHIP</span>
    <h3 class="module-title">Membership</h3>
    <code class="module-pkg">@gravito/satellite-membership</code>
    <p class="module-desc">Multi-guard authentication, roles, and permission control.</p>
  </div>
</div>

  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">DARK MATTER</span>
    <h3 class="module-title">Dark Matter</h3>
    <code class="module-pkg">@gravito/dark-matter</code>
    <p class="module-desc">Specifically designed high-performance driver for MongoDB, supporting complex document queries and relations.</p>
  </div>

  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">PLASMA</span>
    <h3 class="module-title">Plasma Redis</h3>
    <code class="module-pkg">@gravito/plasma</code>
    <p class="module-desc">Plasma. High-performance Redis integration for cache, session, and distributed lock systems.</p>
  </div>

  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">STASIS</span>
    <h3 class="module-title">Stasis Cache</h3>
    <code class="module-pkg">@gravito/stasis</code>
    <p class="module-desc">Time suspension. A smart multi-level cache system that freezes and retrieves high-frequency data in milliseconds.</p>
  </div>

  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">NEBULA</span>
    <h3 class="module-title">Nebula Storage</h3>
    <code class="module-pkg">@gravito/nebula</code>
    <p class="module-desc">The Nebula. Cloud storage and file management system supporting S3, GCS, and local file drivers.</p>
  </div>
</div>

## Frontend & Rendering
<div class="ecosystem-grid">
  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">MOMENTUM</span>
    <h3 class="module-title">Ion Bridge</h3>
    <code class="module-pkg">@gravito/ion</code>
    <p class="module-desc">Momentum transfer. A full-stack bridge that dissolves the boundary between SPA and MVC for seamless navigation.</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">PRISM</span>
    <h3 class="module-title">Prism View</h3>
    <code class="module-pkg">@gravito/prism</code>
    <p class="module-desc">High-performance template rendering engine with built-in image optimization and modern SSR support.</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">FREEZE</span>
    <h3 class="module-title">Freeze SSG</h3>
    <code class="module-pkg">@gravito/freeze</code>
    <p class="module-desc">Suspension. Static Site Generator providing ultimate loading speed and SEO for your applications.</p>
  </div>
</div>

## Security & Fortification
<div class="ecosystem-grid">
  <div class="module-card security group">
    <div class="card-accent"></div>
    <span class="module-code">SENTINEL</span>
    <h3 class="module-title">Sentinel Auth</h3>
    <code class="module-pkg">@gravito/sentinel</code>
    <p class="module-desc">Core authentication system providing JWT, Session, and robust Guard mechanisms for endpoints.</p>
  </div>

  <div class="module-card security group">
    <div class="card-accent"></div>
    <span class="module-code">FORTIFY</span>
    <h3 class="module-title">Fortify UI</h3>
    <code class="module-pkg">@gravito/fortify</code>
    <p class="module-desc">End-to-end authentication workflows including login, registration, and password reset scaffolding.</p>
  </div>

  <div class="module-card security group">
    <div class="card-accent"></div>
    <span class="module-code">MASS</span>
    <h3 class="module-title">Mass Validator</h3>
    <code class="module-pkg">@gravito/mass</code>
    <p class="module-desc">Mass calculation. High-performance data validation engine ensuring data flowing into the system meets strict specifications.</p>
  </div>

  <div class="module-card security group">
    <div class="card-accent"></div>
    <span class="module-code">IMPULSE</span>
    <h3 class="module-title">Impulse Request</h3>
    <code class="module-pkg">@gravito/impulse</code>
    <p class="module-desc">Form-request validation with Zod or Valibot, authorization hooks, and type-safe validated payloads.</p>
  </div>

  <div class="module-card security group">
    <div class="card-accent"></div>
    <span class="module-code">PULSAR</span>
    <h3 class="module-title">Pulsar Session</h3>
    <code class="module-pkg">@gravito/pulsar</code>
    <p class="module-desc">Session management with CSRF protection and multiple drivers for cache, Redis, file, and SQLite.</p>
  </div>
</div>

## Communication & Signals
<div class="ecosystem-grid">
  <div class="module-card comm group">
    <div class="card-accent"></div>
    <span class="module-code">RIPPLE</span>
    <h3 class="module-title">Ripple Broadcast</h3>
    <code class="module-pkg">@gravito/ripple</code>
    <p class="module-desc">Ripple communication. A WebSockets-based module that synchronizes data changes across all clients like ripples on water.</p>
  </div>

  <div class="module-card comm group">
    <div class="card-accent"></div>
    <span class="module-code">SIGNAL</span>
    <h3 class="module-title">Signal Mail</h3>
    <code class="module-pkg">@gravito/signal</code>
    <p class="module-desc">The Signal. Professional-grade mail delivery system supporting various SMTP and API drivers.</p>
  </div>

  <div class="module-card comm group">
    <div class="card-accent"></div>
    <span class="module-code">FLARE</span>
    <h3 class="module-title">Flare Notify</h3>
    <code class="module-pkg">@gravito/flare</code>
    <p class="module-desc">Solar Flare. Multi-channel notification center handling Web Push, SMS, and Instant Messaging notifications.</p>
  </div>

  <div class="module-card comm group">
    <div class="card-accent"></div>
    <span class="module-code">RADIANCE</span>
    <h3 class="module-title">Radiance Broadcast</h3>
    <code class="module-pkg">@gravito/radiance</code>
    <p class="module-desc">Multi-driver broadcasting with Pusher, Ably, Redis, and WebSocket integrations.</p>
  </div>

  <div class="module-card comm group">
    <div class="card-accent"></div>
    <span class="module-code">RIPPLE CLIENT</span>
    <h3 class="module-title">Ripple Client</h3>
    <code class="module-pkg">@gravito/ripple-client</code>
    <p class="module-desc">Frontend WebSocket client with React hooks and Vue composables for Ripple channels.</p>
  </div>
</div>

## Env & Observability
<div class="ecosystem-grid">
  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">LUMINOSITY</span>
    <h3 class="module-title">Luminosity SEO</h3>
    <code class="module-pkg">@gravito/luminosity</code>
    <p class="module-desc">The Brightness. SEO smart engine, automatically managing meta data and search engine indexing optimizations.</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">COSMOS</span>
    <h3 class="module-title">Cosmos I18n</h3>
    <code class="module-pkg">@gravito/cosmos</code>
    <p class="module-desc">The Universe. Enterprise-grade Multi-language management solution supporting dynamic translation and localization.</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">CONSTELLATION</span>
    <h3 class="module-title">Constellation</h3>
    <code class="module-pkg">@gravito/constellation</code>
    <p class="module-desc">The Constellation. Automated sitemap and site topology generator enhancing search engine crawling efficiency.</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">HORIZON</span>
    <h3 class="module-title">Horizon Scheduler</h3>
    <code class="module-pkg">@gravito/horizon</code>
    <p class="module-desc">Distributed task scheduling system supporting precision Cron expressions and cluster-wide locking.</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">ECHO</span>
    <h3 class="module-title">Echo Webhooks</h3>
    <code class="module-pkg">@gravito/echo</code>
    <p class="module-desc">Intelligent Webhook reception and dispatching system for real-time integration with 3rd-party services.</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">MONITOR</span>
    <h3 class="module-title">Monitor Observability</h3>
    <code class="module-pkg">@gravito/monitor</code>
    <p class="module-desc">Health checks, Prometheus metrics, and OpenTelemetry tracing hooks for production visibility.</p>
  </div>
</div>

## Workflow & Automation
<div class="ecosystem-grid">
  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">ZENITH</span>
    <h3 class="module-title">Zenith</h3>
    <code class="module-pkg">@gravito/zenith</code>
    <p class="module-desc">The Control Plane. Zero-config dashboard for monitoring and managing your Flux workflows and Stream queues in real-time.</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">FLUX</span>
    <h3 class="module-title">Flux Workflow</h3>
    <code class="module-pkg">@gravito/flux</code>
    <p class="module-desc">State-machine workflow engine with retries, timeouts, and pluggable storage adapters.</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">STREAM</span>
    <h3 class="module-title">Stream Queue</h3>
    <code class="module-pkg">@gravito/stream</code>
    <p class="module-desc">High-performance job queues with multi-driver support and embedded or standalone workers.</p>
  </div>
</div>

## Content & Media
<div class="ecosystem-grid">
  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">MONOLITH</span>
    <h3 class="module-title">Monolith CMS</h3>
    <code class="module-pkg">@gravito/monolith</code>
    <p class="module-desc">File-based CMS that turns Markdown collections into a queryable content API.</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">FORGE</span>
    <h3 class="module-title">Forge Media</h3>
    <code class="module-pkg">@gravito/forge</code>
    <p class="module-desc">Image and video processing pipelines with status tracking and storage integration.</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">SITE</span>
    <h3 class="module-title">Site Toolkit</h3>
    <code class="module-pkg">@gravito/site</code>
    <p class="module-desc">Static documentation toolkit built on Monolith, Cosmos, and Constellation.</p>
  </div>
</div>

## Tooling & DX
<div class="ecosystem-grid">
  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">SCAFFOLD</span>
    <h3 class="module-title">Scaffold Generator</h3>
    <code class="module-pkg">@gravito/scaffold</code>
    <p class="module-desc">Project generators for MVC, DDD, and clean architecture presets.</p>
  </div>

  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">CREATE</span>
    <h3 class="module-title">Create Gravito App</h3>
    <code class="module-pkg">create-gravito-app</code>
    <p class="module-desc">Starter bootstrapper that scaffolds new Gravito apps with curated templates.</p>
  </div>

  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">ASTRAL</span>
    <h3 class="module-title">Astral OpenAPI</h3>
    <code class="module-pkg">@gravito/astral</code>
    <p class="module-desc">The Projection. Automated OpenAPI (Swagger) documentation generator from your Zod schemas and routes.</p>
  </div>
</div>

## Adapters & Clients
<div class="ecosystem-grid">
  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">FREEZE REACT</span>
    <h3 class="module-title">Freeze React</h3>
    <code class="module-pkg">@gravito/freeze-react</code>
    <p class="module-desc">React bindings for Freeze with StaticLink and locale utilities.</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">FREEZE VUE</span>
    <h3 class="module-title">Freeze Vue</h3>
    <code class="module-pkg">@gravito/freeze-vue</code>
    <p class="module-desc">Vue bindings for Freeze with StaticLink and locale utilities.</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">LUX CLI</span>
    <h3 class="module-title">Luminosity CLI</h3>
    <code class="module-pkg">@gravito/luminosity-cli</code>
    <p class="module-desc">CLI for sitemap stats, compaction, and cache warming workflows.</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">LUX PHOTON</span>
    <h3 class="module-title">Luminosity Photon Adapter</h3>
    <code class="module-pkg">@gravito/luminosity-adapter-photon</code>
    <p class="module-desc">Photon middleware integration for Luminosity SEO routes.</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">LUX EXPRESS</span>
    <h3 class="module-title">Luminosity Express Adapter</h3>
    <code class="module-pkg">@gravito/luminosity-adapter-express</code>
    <p class="module-desc">Express middleware integration for Luminosity SEO routes.</p>
  </div>
</div>

</div>

---

## How to Install?

All kinetic modules can be easily installed via Bun. You can decide which gravities your application needs based on your project requirements.
