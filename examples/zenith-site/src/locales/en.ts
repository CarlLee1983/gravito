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
      'Gravito Zenith is a zero-config control plane for Gravito Flux & Stream. It provides comprehensive monitoring, queue management, and operational insights for your asynchronous infrastructure—all without requiring a single configuration file.',
    whatIsDescription2:
      "Built with dogfooding principles, Zenith uses @gravito/photon for HTTP serving and @gravito/stream for queue interaction, ensuring it's battle-tested and production-ready.",
    coreFeatures: 'Core Features',
    technicalSpecs: 'Technical Specifications',
    backend: 'Backend',
    frontend: 'Frontend',
    deployment: 'Deployment',
    additionalCapabilities: 'Additional Capabilities',
    dlqOperations: 'DLQ Operations:',
    dlqOperationsDesc: 'Batch retry or clear failed jobs directly from the UI',
    logArchiving: 'Operational Log Archiving:',
    logArchivingDesc:
      'Persistent storage for system events and worker activities with history search',
    batchActions: 'Batch Actions:',
    batchActionsDesc: 'Flush delayed jobs, purge queues, and bulk operations',
    retentionManagement: 'Retention Management:',
    retentionManagementDesc: 'Configurable auto-cleanup for historical data',
    backToHome: '← Back to Home',
  },
  footer: {
    copyright: '© 2026 Gravito. All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    contact: 'Contact',
  },
}
