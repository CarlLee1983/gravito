# @gravito/luminosity-cli 🛠️

> Command Line Interface for Gravito SmartMap Engine.

`@gravito/luminosity-cli` is the companion CLI tool for `@gravito/luminosity`. It allows you to initialize SEO configurations, manually generate sitemaps, and manage incremental logs directly from your terminal.

## 📦 Installation

```bash
bun add @gravito/luminosity-cli
```

Or run directly using `bunx`:

```bash
bunx gravito-seo --help
```

## 🚀 Commands

### `init`
Initialize a new Gravito SEO configuration file in your project.

```bash
gravito-seo init
```
This command will walk you through a setup wizard to create `gravito.seo.config.ts`.

### `generate`
Manually generate a `sitemap.xml` file based on your configuration.

```bash
# Basic generation
gravito-seo generate

# Specify a custom config file and output path
gravito-seo generate --config ./configs/seo.ts --out ./dist/sitemap.xml
```

**Options:**
- `-c, --config <path>`: Path to the configuration file.
- `-o, --out <path>`: Output path (e.g., `./public/sitemap.xml`).

### `compact`
Force the compaction of incremental logs. This is useful when using `incremental` mode to merge individual log entries into a single state, improving performance.

```bash
gravito-seo compact
```

**Options:**
- `-c, --config <path>`: Path to the configuration file.

## 🔧 Global Options

- `-v, --version`: Show the current version.
- `-h, --help`: Display help information for commands.

## 📄 License

MIT © Carl Lee
