---
title: CLI Reference
order: 4
---

# CLI Reference

Luminosity provides a powerful command-line interface (CLI) to manage your sitemaps, inspect indexes, and automate tasks in your CI/CD pipeline.

## Usage

If installed locally in your project:

```bash
bun x lux <command> [options]
```

Or add script aliases to your `package.json`:

```json
{
  "scripts": {
    "lux:gen": "lux generate",
    "lux:stats": "lux stats"
  }
}
```

## Commands

### `generate`

Manually trigger the sitemap generation process via the CLI. This is useful for cron jobs or build hooks.

```bash
bun x lux generate [options]
```

**Options:**
- `-c, --config <path>`: Path to config file (default: `luminosity.config.ts`)
- `--dry-run`: Simulate generation without writing files.

### `stats`

Inspect the current state of your sitemap index. View total URL counts, file sizes, and fragmentation details.

```bash
bun x lux stats
```

**Output Example:**
```text
┌  Luminosity Status
│  Total URLs: 1,240,592
│  Index Size: 45.2 MB
│  Fragments:  12
└  Ready.
```

### `warm`

Forcefully warm the cache or compaction process. Useful to run before a major traffic event or after a large data ingestion.

```bash
bun x lux warm
```

### `init`

Scaffold a new Luminosity configuration file in the current directory.

```bash
bun x lux init
```

## CI/CD Integration

Luminosity CLI is designed to exit with standard exit codes (0 for success, 1 for error), making it perfect for CI pipelines.

**Example: GitHub Actions**

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Install dependencies
    run: bun install
  - name: Generate Sitemaps
    run: bun x lux generate
  - name: Deploy
    run: ./deploy.sh
```
