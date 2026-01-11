export default {
  nav: {
    features: 'Features',
    integration: 'Integration',
    docs: 'Docs',
    about: 'About',
  },
  hero: {
    status: 'SYSTEM ONLINE',
    title: 'Control Plane for',
    titleHighlight: 'Flux & Stream',
    description:
      'Zero-config control plane for Gravito Flux & Stream. Real-time monitoring, queue management, job auditing, and automated alerting—all without a single configuration file.',
    getStarted: 'Get Started',
    documentation: 'Documentation',
  },
  features: {
    title: 'Everything You Need to Manage Your Queues',
    subtitle:
      'Comprehensive monitoring and management tools built for modern asynchronous infrastructure',
    realtimeMonitoring: {
      title: 'Real-time Monitoring',
      description:
        'Track job throughput and error rates with millisecond precision. Monitor system health with live metrics and instant updates.',
    },
    queueManagement: {
      title: 'Queue Management',
      description:
        'Pause, resume, and inspect queues with ease. View waiting, delayed, and failed jobs with detailed pagination and filtering.',
    },
    jobAuditing: {
      title: 'Job Auditing & Search',
      description:
        'Permanent history via SQL with global search. Query both Redis (live) and SQL (archive) simultaneously for complete visibility.',
    },
    dlqOperations: {
      title: 'DLQ Operations',
      description:
        'Batch retry or clear failed jobs directly from the UI. Inspect stack traces and replay specific events with a single click.',
    },
    automatedAlerting: {
      title: 'Automated Alerting',
      description:
        'Slack notifications for failure spikes or backlog issues. Real-time checks with cool-down logic to prevent alert fatigue.',
    },
    scheduleManagement: {
      title: 'Schedule Management',
      description:
        'Full UI for Cron jobs. Manage scheduled tasks, view execution history, and configure recurring operations effortlessly.',
    },
  },
  integration: {
    title: 'Zero-Config Deployment',
    description:
      "Zenith automatically discovers your Flux queues and Stream topics. Built-in SQLite support means no database server required for local auditing. Just connect to Redis and you're ready.",
    features: {
      autoDiscovery: 'Auto-discovery of queues and topics',
      sqliteSupport: 'Built-in SQLite support for local auditing',
      workerHealth: 'Worker health monitoring with live CPU and RAM metrics',
      logArchiving: 'Operational log archiving with history search',
      batchActions: 'Batch actions: flush delayed jobs, purge queues, bulk operations',
      hybridSearch: 'Hybrid search across Redis (live) and SQL (archive)',
    },
  },
  about: {
    title: 'About',
    titleHighlight: 'Zenith',
    whatIs: 'What is Zenith?',
    whatIsDescription1:
      'Gravito Zenith is a premium control plane built for elite performance. As the command center of the Gravito ecosystem, it monitors modern asynchronous architectures with millisecond precision, capturing every heartbeat of your system.',
    whatIsDescription2:
      'We believe in simplicity and zero-interference. Built on our own @gravito/photon and @gravito/stream, Zenith provides an intuitive yet powerful experience, ensuring your codebase stays pure while your visibility remains absolute.',
    story: {
      title: 'Origin: Precision Born from Pain',
      content:
        'When managing large-scale distributed systems, developers often face a trade-off: high latency in monitoring tools or superficial data visibility. While tools like Laravel Horizon set the standard, their limits become clear under cross-language and high-audit requirements. Zenith was born to shatter these boundaries.',
    },
    philosophy: {
      title: 'Vision: Introspection without Interference',
      content:
        'Monitoring should never be a system bottleneck. Using the Gravito Pulse Protocol, we implement "Introspection without Interference"—keeping your performance intact while giving you God-like control over your entire lifecycle.',
    },
    roadmap: {
      title: 'Blueprint: From Queues to Orchestration',
      content:
        'Today, Zenith is a top-tier queue controller. Tomorrow, we are bringing multi-cloud auto-scaling, AI-driven anomaly diagnostics, and a unified control plane for cross-language microservice architectures.',
    },
    coreFeatures: 'Core Features',
    technicalSpecs: 'Technical Architecture',
    backend: 'Backend Engine',
    frontend: 'Frontend Interface',
    deployment: 'Deployment Philosophy',
    additionalCapabilities: 'Deep Capabilities',
    dlqOperations: 'DLQ Operations:',
    dlqOperationsDesc: 'Batch retry or clear failed jobs directly from the UI',
    logArchiving: 'Operational Log Archiving:',
    logArchivingDesc:
      'Persistent storage for system events and worker activities with history search',
    batchActions: 'Batch Actions:',
    batchActionsDesc: 'Flush delayed jobs, purge queues, and bulk operations',
    retentionManagement: 'Retention Management:',
    retentionManagementDesc: 'Configurable auto-cleanup for historical data',
    backToHome: '← Back to Zenith',
  },
  features_deep: {
    title: 'The Core of',
    titleHighlight: 'Observability',
    subtitle:
      'Deep dive into the architecture that powers the next generation of mission-critical monitoring.',

    persistence: {
      title: 'Hybrid Persistence Strategy',
      description:
        'Why settle for just real-time or just historical? Zenith uses a dual-engine approach to ensure you never lose a heartbeat.',
      redis: {
        title: 'Transient Engine (Redis)',
        content:
          'Captures the raw intensity of your systems. Real-time queue depths, worker status, and millisecond throughput tracking. No disk lag, just pure memory performance.',
      },
      sql: {
        title: 'Audit Engine (SQLite/MySQL)',
        content:
          'Zenith automatically offloads completed and failed job data to SQL persistence. This provides a permanent, searchable audit trail that survives Redis reboots and memory purges.',
      },
    },

    protocol: {
      title: 'Gravito Pulse Protocol (GPP)',
      description:
        'GPP is our lightweight telemetry protocol designed for massive scale and zero-interference.',
      feature1: {
        title: 'Loss-Tolerant UDP/Redis',
        content:
          'Optimized for high-volume transport where accuracy is key but performance is non-negotiable.',
      },
      feature2: {
        title: 'Cross-Language Native',
        content:
          'Native support for PHP (Zenith), Go (Quasar), and Node.js. Speak the same language across your entire microservice galaxy.',
      },
      feature3: {
        title: 'Zero Configuration',
        content:
          'Automatic service discovery via Redis pattern matching. No more manual endpoint mapping.',
      },
    },

    performance: {
      title: 'Elite Performance',
      latency: 'Lower than 0.1ms overhead per job report',
      throughput: 'Supports up to 50k OPS on standard hardware',
      reliability: '99.99% Reliability in production loads',
    },
  },
  integrations: {
    title: 'Interstellar',
    titleHighlight: 'Connectivity',
    subtitle: 'Zenith bridges the gap between different stacks, languages, and infrastructures.',

    core: {
      title: 'The Control Plane',
      description:
        'Deploy the central dashboard your way. Run it as a standalone microservice or embed it directly into your existing infrastructure.',
      docker_feature: 'Production-ready Docker image',
      node_feature: 'Middleware for Express/Gravito',
      db_feature: 'MySQL/PostgreSQL/SQLite support',
    },

    laravel: {
      title: 'Laravel Zenith',
      description:
        'The native In-App reporter. Deeply integrated into Laravel to capture logs, HTTP metrics, and queue events.',
      feature1: 'In-App event reporting',
      feature2: 'Live log streaming',
      feature3: 'Native Artisan integration',
    },

    quasar_lib: {
      title: 'Quasar (Node/Bun)',
      description:
        'Universal runtime library for Node.js, Bun, and Deno. Embed monitoring directly into your workers for granular job tracking.',
      feature1: 'Granular job lifecycle tracking',
      feature2: 'Zero-overhead bridge architecture',
      feature3: 'Support for BullMQ & Bee-Queue',
    },

    quasar_go: {
      title: 'Quasar-Go Agent',
      description:
        'Standalone binary agent. Deploy on any host to monitor system resources and external queues without code changes.',
      feature1: 'Zero-dependency binary',
      feature2: 'System-level metrics (CPU/RAM)',
      feature3: 'Remote control capabilities',
    },

    astral: {
      title: 'Astral OpenAPI',
      description:
        'The Shadow-Contract documentation engine. Generate OpenAPI specs and Swagger UI without adding a single decorator to your code.',
      feature1: 'Shadow-Contract architecture',
      feature2: 'Zero-purity loss design',
      feature3: 'Automatic DTO inference',
    },

    ecosystem: {
      title: 'The Ecosystem',
      redis: 'Redis 6.0+ Sharded/Cluster support',
      sql: 'Persistent audit via MySQL/PostgreSQL/SQLite',
      cloud: 'Native Docker & K8s deployment patterns',
    },
  },
  footer: {
    copyright: '© 2026 Gravito. All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    contact: 'Contact',
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: January 2026',
    section1: {
      title: 'Our Data Philosophy',
      content:
        'At Gravito, we believe your data belongs to you. Zenith is a control plane designed for absolute introspection, not extraction. We do not sell, trade, or share your application metrics with any third parties—your heartbeats stay within your galaxy.',
    },
    section2: {
      title: 'Data we Collect',
      content:
        'We only collect anonymous usage data to improve the platform experience. This includes navigation patterns and feature usage within the Zenith dashboard. We do not access the content of your Redis or SQL data stores outside of your local environment.',
    },
    section3: {
      title: 'Cookies & Analytics',
      content:
        'We use minimal cookies for session management and basic performance analytics (e.g., Vercel Analytics) to ensure the stability of our web services.',
    },
  },
  terms: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: January 2026',
    section1: {
      title: 'Software Usage',
      content:
        'Zenith is provided as an open-source tool under the MIT license. While we strive for absolute reliability, it is provided "as is" without warranty of any kind.',
    },
    section2: {
      title: 'Responsibility',
      content:
        'Users are responsible for the security of their own Redis and SQL instances. Gravito is not liable for data loss or service interruptions caused by misconfiguration or improper use of the Zenith control plane.',
    },
    section3: {
      title: 'Ethical Use',
      content:
        'Zenith is intended for system monitoring and legitimate development purposes. Any use involved in malicious activities or unauthorized surveillance is strictly prohibited.',
    },
  },
  contact: {
    title: 'Contact',
    subtitle: 'Connect with the Architects',
    description:
      'Have questions about integration, custom solutions, or just want to say hi? Our team is standing by.',
    email: 'hello@gravito.dev',
    socials: {
      github: 'GitHub Community',
      twitter: 'Follow our Journey',
      discord: 'Join Discord',
    },
  },
}
