export default {
  site: {
    title: 'Gravito Framework - The High-Performance Backend Ecosystem for Builders',
    description:
      'Superior development framework. Designed for enterprise scalability with native queuing, scheduling, and AI-optimized type contracts.',
    keywords:
      'Bun framework, Gravito Core, Inertia.js bridge, Enterprise TS framework, Micro-kernel architecture, AI-friendly development',
  },
  nav: {
    features: 'Features',
    benchmarks: 'Benchmarks',
    docs: 'Docs',
    releases: 'Releases',
    about: 'About',
    github: 'GitHub',
  },
  hero: {
    title: 'GRAVITO',
    core: 'CORE',
    tagline: 'Ultra-Lightweight Enterprise Core',
    startBtn: 'Quick Start',
    githubBtn: 'Github',
    deployBtn: 'Deploy Now',
  },
  stack: {
    title: 'Elite Tech Stack',
    subtitle: 'Built for the Future',
    bun_title: 'Bun Runtime',
    bun_desc: 'Lightning fast runtime with native testing and bundling.',
    engine_title: 'Gravito Core',
    engine_desc:
      'Self-developed high-performance core with nano-overhead I/O and lifecycle management.',
    ts_title: 'TypeScript',
    ts_desc: 'First-class type safety across the entire framework.',
  },
  features: {
    sectionBadge: '1.0 Core Release',
    sectionTitle: 'The',
    sectionTitleHighlight: 'Gravito Ecosystem',
    sectionDesc:
      'Gravito uses a micro-kernel design. The initial 1.0 release features our most stable and powerful base modules.',
    kernel_title: 'PlanetCore',
    kernel_subtitle: 'The Soul of Gravito',
    kernel_desc:
      'Our self-developed high-performance micro-kernel. Precision-engineered for rapid I/O coordination and lifecycle management.',
    inertia_title: 'Ion',
    inertia_subtitle: 'Full-stack Bridge (Inertia)',
    inertia_desc: 'Let the backend fully control UI, creating a seamless SPA-like experience.',
    cli_title: 'Pulse',
    cli_subtitle: 'Productivity Tool (CLI)',
    cli_desc: 'Automated scaffolding and dev commands for better workflow.',
    seo_title: 'Luminosity',
    seo_subtitle: 'Smart Indexing (SEO)',
    seo_desc: 'Automated sitemap generation and meta management for visibility.',
    image_title: 'Prism',
    image_subtitle: 'Performance Focus (Image)',
    image_desc:
      'Inspired by Next.js, our image component handles CLS prevention, lazy loading, and responsive `srcset` with zero client-side overhead.',
    i18n_title: 'Cosmos',
    i18n_subtitle: 'Global Gravity (I18n)',
    i18n_desc:
      'Native locale detection and prefixed routing with type-safe translations, ready for global scaling.',
    getStarted: 'Get Started',
  },
  features_page: {
    hero_title: 'Unleashing the Self-Developed Core',
    hero_subtitle: 'Gravito Core (PlanetCore) is the genesis of all our innovation.',
    core_deep_dive_title: 'Why Self-Developed?',
    core_deep_dive_desc:
      'Modern frameworks are powerful, but they often come with heavy runtime overhead and unpredictable external dependencies. Gravito Core was built to reclaim absolute control over performance.',
    adv_title: 'Why It Matters',
    adv1_title: 'Zero-Overhead Pre-compiled Routing',
    adv1_desc:
      'Unlike frameworks that perform dynamic regex matching at runtime, Gravito Core optimizes the routing tree into the simplest jump paths during boot.',
    adv2_title: 'Engine Agnostic (Adapter Pattern)',
    adv2_desc:
      'The core is completely decoupled from the underlying HTTP engine. Swap Photon, Express, or Bun native modes without changing business logic.',
    adv3_title: 'AI-First Contracts',
    adv3_desc:
      'Deep type inference and predictable code patterns aren’t accidents. They are architectural designs that help AI agents like Cursor or Windsurf "understand" your system.',
    adv4_title: 'Supreme Lean & Zero Bloat',
    adv4_desc:
      'Maintain a tiny core footprint with zero forced dependencies. Experience true performance-on-demand: only the modules you ignite will consume resources.',
    perf_title: 'Extreme Efficiency Paradigm',
    perf_desc:
      'Every microsecond matters. PlanetCore eliminates unnecessary abstraction layers, delivering raw performance to your application.',
    perf_latency: 'Latency',
    perf_boot: 'Boot Time',
    perf_deps: 'External Deps',
    ready_title: 'Ready to experience the gravity?',
    choices_title: 'Our Technology DNA',
    bun_title: 'Why Bun over Node.js?',
    bun_desc:
      'Bun is more than just a runtime; it’s an all-in-one engine built for the modern web. It offers startup speeds that Node.js simply can’t match, along with a native high-performance HTTP server. In Gravito, Bun reduces cold starts by over 10x while eliminating boilerplate configuration.',
    ts_title: 'Why First-Class TypeScript?',
    ts_desc:
      'We believe "types are documentation." Static analysis and type inference are the cornerstones of scalable systems. In the era of AI-native development, clear type definitions allow AI agents to provide significantly more accurate assistance and code generation.',
    // Galaxy Architecture Comparison
    compare_title: 'Galaxy Architecture vs Traditional Frameworks',
    compare_subtitle: 'Why Gravito outperforms Hono, Express, and beyond',
    vs_arch_title: 'Micro-Kernel + Orbits',
    vs_arch_desc:
      'Unlike single-layer HTTP frameworks, Gravito uses a Galaxy Architecture—a micro-kernel (PlanetCore) with pluggable Orbits. Add only what you need: Auth (Sentinel), Cache (Stasis), ORM (Atlas), and more.',
    vs_adapter_title: 'HTTP Adapter Pattern',
    vs_adapter_desc:
      'Transparently switch between Photon, Bun Native, or Express without changing a single line of business logic. True engine-agnostic design.',
    vs_hooks_title: 'WordPress-Style Hook System',
    vs_hooks_desc:
      'Powerful Filters and Actions let you intercept and modify any part of the request lifecycle. Customize error handling, logging, and responses with surgical precision.',
    vs_router_title: 'Laravel-Style Fluent Router',
    vs_router_desc:
      'Controller-based routing, FormRequest validation, Resource Routes, Route Model Binding, and Named Routes with URL generation—all built-in.',
    vs_ioc_title: 'IoC Container',
    vs_ioc_desc:
      'Enterprise-grade dependency injection with singleton management, service providers, and a register/boot lifecycle—missing from Hono entirely.',
    vs_native_title: 'Bun Native Adapter',
    vs_native_desc:
      'When running on Bun, Gravito automatically uses our custom RadixRouter for O(log n) route matching with zero abstraction overhead.',
  },
  benchmarks: {
    sectionBadge: 'Bio-Lab Benchmarks',
    sectionTitle: 'Efficiency Beyond',
    sectionTitleHighlight: 'Limits',
    sectionDesc: 'Built on Gravito Core and Bun, maximizing throughput while near zero overhead.',
    rps_title: 'Requests Per Second (RPS)',
    rps_desc: 'Unmatched throughput compared to traditional Node.js frameworks.',
    latency_title: 'Average Latency',
    latency_desc: 'Optimized routing ensures near-instant response times.',
    startup_title: 'Cold Start Speed',
    startup_desc: 'Millisecond startup, perfect for Serverless and high-density containers.',
    env_note: '* Environment: Bun v1.1.x, Ubuntu 22.04 LTS.',
  },
  stats: {
    efficiency: 'Runtime Efficiency',
    bottleneck: 'Kernel Bottleneck',
    integrity: 'Architectural Integrity',
  },
  footer: {
    desc: 'The High-Performance Framework for Builders. Powered by Gravito Core & Bun for extreme speed and simplicity.',
    ecosystem: 'Ecosystem',
    links: 'Links',
    home: 'Home',
    lux: 'Luminosity (Lux)',
    lux_note: 'Luminosity (Lux) — The sitemap engine built on Gravito Core.',
    connect: 'Connect',
    copyright: 'Gravito Framework. MIT License.',
  },
  about: {
    heroTitle: 'THE GRAVITATIONAL',
    heroSubtitle: 'PULL OF INNOVATION',
    missionTitle: 'Our Mission',
    missionDesc:
      "To provide a framework that respects the developer's time and the machine's resources.",
    pillarsTitle: 'The Singularity Pillars',
    pillar1_title: 'Unrivaled Speed',
    pillar1_desc:
      'By harnessing Gravito Core and Bun, we eliminate the bloat of traditional Node.js stacks.',
    pillar2_title: 'Architectural Zen',
    pillar2_desc:
      'Inspired by the elegance of classic MVC patterns and the agility of modern Node.js ecosystems. Gravito is built to scale from minimalist content sites to robust, high-density enterprise applications.',
    pillar3_title: 'Pain-Point Driven',
    pillar3_desc:
      'We focus on the solutions other frameworks miss. By addressing real-world enterprise bottlenecks, we provide a friction-less experience for both developers and AI agents.',
    teamTitle: 'The Builders',
    teamDesc:
      'Gravito is built by builders who believe that a framework should be more than a tool—it should be a partner that solves the gaps left by traditional stacks.',
    architectureTitle: 'The Celestial Architecture',
    architectureSubtitle: 'Micro-Kernel & Kinetic Modules',
    kernelTitle: 'PlanetCore (The Micro-Kernel)',
    kernelDesc:
      'An ultra-minimalist core that handles only the most critical lifecycles and I/O coordination. It stays out of your way until you need it.',
    orbitTitle: 'Kinetic Modules',
    orbitDesc:
      'Want React? Add Ion. Want Vue? Add Ion. Want HTML? Add Prism. Want SEO? Add Luminosity. Need a Database? Add Atlas (not available in v1.0). Load only what you need, when you need it.',
    scaleTitle: 'Infinite Scalability',
    scaleDesc:
      "From a single-file API to a global enterprise system, the architecture adapts dynamically to your project's gravity.",
    aiTitle: 'The AI-First Contract',
    aiSubtitle: 'Designed for Human-AI Synergy',
    aiFeature1Title: 'Predictable Patterns',
    aiFeature1Desc:
      'Strict MVC and Service Layer patterns ensure AI agents understand and generate business logic with maximum precision.',
    aiFeature2Title: 'CLI-Driven Development',
    aiFeature2Desc:
      'Structured CLI outputs and scaffolding allow AI assistants to perform complex operations on your behalf.',
    aiFeature3Title: 'Zero-Ambiguity Types',
    aiFeature3Desc:
      'First-class TypeScript support across all modules provides a clear contract that eliminates AI "hallucinations".',
    // Pain Points
    painSubtitle: 'Solving Enterprise Bottlenecks',
    painTitle: 'Pain-Point Driven Evolution',
    pain1Title: 'The SEO x SPA Paradox',
    pain1Desc:
      "Gravito bridges the gap between fluid SPA experiences and absolute SEO visibility via Luminosity's integrated rendering.",
    pain2Title: 'Resource Density',
    pain2Desc:
      'Built on a micro-kernel, Gravito consumes up to 60% less memory than bloated enterprise frameworks.',
    pain3Title: 'Logic Fragmentation',
    pain3Desc:
      'Unified Service Layers and cross-module communication prevent logic rot in long-term projects.',
    pain4Title: 'AI Alignment',
    pain4Desc:
      'Predictable file structures mean AI agents can maintain complex codebases without human intervention.',
    // Enterprise DNA Section
    dnaSubtitle: 'Beyond the Scripting Paradox',
    dnaTitle: 'Native Enterprise Systems',
    dnaComparisonTitle: 'The Architecture Gap',
    dnaNodeGaps:
      'Most Node/Bun frameworks are "Frontend-First", lacking essential system architecture like Schedulers and Message Queues, leading to dependency hell.',
    dnaLaravelGaps:
      'Legacy frameworks like Laravel offer completeness but suffer from massive bloat and performance bottlenecks in modern high-concurrency environments.',
    dnaGravitoAdv:
      'Gravito is powered by Bun and Gravito Core for extreme speed, natively integrating enterprise-grade Schedulers, Queues, and I/O coordination within a single unified core.',
    featDecouplingTitle: 'Microservice Extraction',
    featDecouplingDesc:
      'Design for today, scale for tomorrow. Extract message consumers into independent microservices with zero architectural friction—no code rewrites required.',
    featPluginsTitle: 'Plugin Sovereignty',
    featPluginsDesc:
      'A dual-mode ecosystem for rapid scaling. Plugins are "Mini-Gravito" entities—complete with routes, controllers, and migrations. Choose between "Instant Metamorphosis" (from empty core to full service) or "Recursive Overrides" (extending logic and UI layers).',
    featAITypesTitle: 'LLM-Optimized Core',
    featAITypesDesc:
      "Leveraging TypeScript—the world's best-trained language for LLMs—to eliminate hallucinations through rock-solid type contracts.",
    queueTitle: 'Universal Kinetic Queue (Stream)',
    queueDesc:
      'One interface, infinite possibilities. Native ambition for full-spectrum driver support: Redis, Amazon SQS, RabbitMQ, Kafka, and more—switch infrastructure without touching business logic.',
    ctaTitle: 'Ready to Enter the Singularity?',
    ctaSubtitle: 'Join the next generation of enterprise development.',
    ctaButton: 'Get Started',
  },
}
