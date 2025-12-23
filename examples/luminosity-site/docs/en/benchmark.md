# 🔥 Performance Benchmark

Luminosity is engineered for **extreme scale**. We don't just claim performance; we prove it.
Using our unique **Streaming Architecture**, Luminosity can generate sitemaps for millions of URLs with a constant, tiny memory footprint.

## The 1 Million URL Challenge

Generating a sitemap for 1,000,000 pages is a common bottleneck for large applications.
Traditional solutions often load all data into memory, causing Node.js processes to crash (Heap Out of Memory) or requiring expensive, high-memory servers.

**Luminosity solves this with:**
1. **Async Iterators**: Streaming data directly from the database to the XML writer.
2. **Backpressure Handling**: Respecting the I/O capacity of the disk.
3. **Automatic Sharding**: Splitting files automatically when they hit the 50,000 URL limit.

## Benchmark Results

We ran a controlled test generating a Sitemap Index for **1,000,000 URLs**.

### Environment
- **Hardware**: MacBook Pro (M2 Pro)
- **Runtime**: Bun v1.1
- **Database**: SQLite (Simulating 1M Product Rows)

### Metrics

| Metric | Result | Note |
| :--- | :--- | :--- |
| **Total URLs** | **1,000,000** | Full sitemap index generation |
| **Time Elapsed** | **~14.2s** | End-to-end processing |
| **Throughput** | **~70,000 URLs/sec** | Extremely fast processing |
| **Peak Memory** | **84 MB** | **Constant Heap Usage** 🤯 |

> **Note**: The most impressive metric is the memory usage. It stays flat regardless of whether you process 10k or 10M URLs.

## Implementation Details

Here is the core logic used in our benchmark. Notice the use of `yield` to stream data one row at a time.

```typescript
// Example using @gravito/luminosity
const sitemap = new SeoEngine({
  baseUrl: 'https://store.example.com',
  mode: 'dynamic', // or incremental
  resolvers: [
    {
      async *getEntries() {
        const stmt = db.prepare('SELECT slug, updated_at FROM products')
        
        // Iterate row by row - never load 1M rows into array!
        for (const row of stmt.iterate()) {
          yield {
            url: `/products/${row.slug}`,
            lastmod: row.updated_at,
            changefreq: 'daily'
          }
        }
      }
    }
  ]
})

await sitemap.init()
```

## Reproduce It

You can run this benchmark yourself. The code is available in our [GitHub Repository](https://github.com/gravito-framework/gravito/tree/main/examples/luminosity-benchmark).

1. Clone the repository.
2. Navigate to `examples/luminosity-benchmark`.
3. Run seeds and benchmark:

```bash
bun install
bun run seed      # Generates 1M records
bun run benchmark # Fires the engine
```
