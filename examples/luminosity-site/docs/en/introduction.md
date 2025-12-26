---
title: Introduction
order: 1
---

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

## Feature Highlights

<h3 id="incremental-lsm-tree-engine">Incremental LSM-Tree Engine</h3>

Luminosity appends new URLs as immutable operations and compacts them in the background. This keeps writes sequential and avoids the lock contention of rewrite-heavy sitemap generators.

<h3 id="enterprise-grade">Enterprise-Grade</h3>

Built-in locking primitives and stale-while-revalidate caching keep sitemaps stable under load. You can ingest updates while serving traffic without blocking reads.

<h3 id="auto-sitemap-index">Auto Sitemap Index</h3>

Once you exceed 50,000 URLs, Luminosity automatically splits sitemaps and publishes a sitemap index. No manual pagination or index management required.

<h3 id="robots-txt-proxy">Robots.txt Proxy</h3>

Serve a programmable `robots.txt` through the same Luminosity pipeline, so crawler rules ship alongside your sitemap updates and stay consistent across environments.

<h3 id="meta-tag-builder">Meta Tag Builder</h3>

Generate Meta, OpenGraph, Twitter Card, and JSON-LD tags from structured metadata. Luminosity keeps output consistent and type-safe across pages.

## CLI First

Luminosity is designed to be controlled via its powerful CLI, `lux`. You can inspect your sitemap stats, trigger compaction, or warm up your cache directly from your terminal.

```bash
bun lux stats
```
