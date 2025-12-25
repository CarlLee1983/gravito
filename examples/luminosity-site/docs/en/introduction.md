# Introduction

Luminosity is the intelligent **SmartMap Engine** for modern, data-intensive web applications. It automates your SEO strategy by managing sitemaps, robots.txt, and search engine pings with unparalleled precision.

For the most complete experience (deep integration, lifecycle hooks, and official adapters), run Luminosity with the Gravito core framework.

## Why Luminosity?

Sitemaps are often an afterthought in web development. As your site grows to thousands or millions of pages, traditional sitemap generation becomes a bottleneck—slow, resource-heavy, and often stale.

Luminosity solves this with a revolutionary approach: **Incremental Management**.

Instead of regenerating your entire sitemap from scratch every time, Luminosity treats your sitemap as a database of URLs. It tracks changes, handles priorities, and "compacts" updates efficiently, ensuring your sitemap is always fresh without killing your server.

## Key Features

- **Streaming Architecture**: Handles millions of URLs with minimal memory footprint.
- **Smart Governance**: Built-in lifecycle management (Create, Update, Delete, Warm).
- **LSM-Tree Inspired**: Utilizes Log-Structured Merge patterns for high-throughput URL ingestion.
- **Automated Compliance**: Automatic `robots.txt` generation and sitemap index splitting (50k limit).
- **Framework-agnostic**: Works perfectly with Gravito, Photon, Express, or any Node.js/Bun framework.

## CLI First

Luminosity is designed to be controlled via its powerful CLI, `lux`. You can inspect your sitemap stats, trigger compaction, or warm up your cache directly from your terminal.

```bash
bun lux stats
```
