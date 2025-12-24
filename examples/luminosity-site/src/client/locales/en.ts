export default {
  nav: {
    features: 'Features',
    docs: 'Docs',
    github: 'GitHub',
    start: 'Get Started',
  },
  hero: {
    tag: 'Luminosity Core v1.0 is Live',
    title: 'ATOMIC',
    subtitle: 'SITEMAPS',
    desc: 'The high-performance sitemap engine built for massive scale. Incremental indexing, zero-latency streaming, and intelligent SEO management.',
    ctaPro: 'Get Started',
    ctaDocs: 'View Docs',
  },
  scroll: 'Scroll to Explore',
  features: {
    lsm: {
      title: 'Incremental LSM-Tree Engine',
      desc: 'Inspired by modern databases. Appends new URLs to a log and merges them in the background, enabling millions of updates without downtime.',
    },
    enterprise: {
      title: 'Enterprise-Grade',
      desc: 'Built-in mutex locking and stale-while-revalidate caching. Safe for high-traffic production environments.',
    },
    index: {
      title: 'Auto Sitemap Index',
      desc: "Automatically handles Google's 50,000 URL limit by splitting sitemaps into a paginated index.",
    },
    proxy: {
      title: 'Robots.txt Proxy',
      desc: 'Programmable control over search engine crawlers with direct integration into Hono and Express.',
    },
    meta: {
      title: 'Meta Tag Builder',
      desc: 'Type-safe generation for Meta, OpenGraph, Twitter Cards, and JSON-LD structured data.',
    },
  },
  features_page: {
    hero: {
      title: 'Precision',
      highlight: 'Engineering.',
      desc: 'Luminosity is built from the ground up to redefine the limits of sequential storage performance.',
    },
    core: {
      title: 'The',
      highlight: 'Singularity',
      suffix: 'Core',
      desc: 'By utilizing a custom-built LSM-Tree engine, Luminosity achieves write speeds that approach the physical limits of your hardware. Our architecture eliminates the fragmentation and lock contention associated with traditional B-Trees.',
    },
    points: {
      atomic: {
        title: 'Atomic Sequential Writes',
        desc: 'Bypass random I/O bottlenecks with a pure log-structured merge flow.',
      },
      compaction: {
        title: 'Dynamic Compaction',
        desc: 'Intelligent multi-threaded compaction that optimizes during idle cycles.',
      },
      zerocopy: {
        title: 'Zero-Copy Serialization',
        desc: 'Leverages direct memory access for lightning-fast data transfer.',
      },
      tiered: {
        title: 'Tiered Storage',
        desc: 'Automatically move hot data to faster tiers for peak performance.',
      },
    },
    cta: {
      title: 'Ready to ignite your data?',
      btn: 'READ THE DOCS',
    },
    architecture: {
      title: 'Pipeline',
      highlight: 'Visualization',
      desc: 'Data flows through a memory-first buffer (MemTable) before being flushed to immutable disk segments (SSTables). This ensures zero read-blocking during massive write operations.',
      step1: 'Ingest Stream',
      step2: 'Memory Buffer',
      step3: 'Immutable Disk Segments',
      step4: 'Bloom Filter Lookup',
    },
    governance: {
      title: 'Crawler',
      highlight: 'Governance',
      desc: 'Luminosity acts as a shield for your infrastructure. It intelligently manages search bot traffic, ensuring your core application resources are never exhausted by aggressive indexing.',
      cards: {
        rate_limit: {
          title: 'Adaptive Rate Limiting',
          desc: 'Automatically throttles bots exceeding 1000 requests/minute while allow-listing Googlebot and Bing.',
        },
        stale: {
          title: 'Stale-While-Revalidate',
          desc: 'Serves slightly stale cache to bots during high load, ensuring 100% perceived availability.',
        },
      },
    },
    cli: {
      title: 'Command Line',
      highlight: 'Mastery',
      desc: 'Control the entire engine from your terminal. Integrate directly into your CI/CD pipeline for automated cache warming and index optimization.',
    },
  },
  benchmark: {
    title: 'RAW',
    subtitle: 'POWER',
    metric: 'Benchmark: 1M URLs / SQLite Source',
    urls: 'Total URLs',
    throughput: 'Throughput',
    memory: 'Memory Peak',
    build: 'Final Build',
  },
}
