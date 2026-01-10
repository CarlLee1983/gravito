# @gravito/luminosity

## 2.0.0

### Major Changes

- 73d01db: # Luminosity 2.0: Enterprise SEO Infrastructure

  This major release transforms Luminosity from a simple sitemap generator into a comprehensive enterprise SEO infrastructure tool.

  ## 🌟 New Features

  - **Rich Media Support**: Full support for Google Image and Video sitemaps extensions.
  - **Universal Scanners**: Automatic route discovery for **Remix**, **SvelteKit**, **Astro**, **Fastify**, and **Hono**.
  - **Cloud Storage**: New `StorageAdapter` architecture allowing sitemaps to be stored in S3/R2 (via `S3Adapter`) instead of the local filesystem.
  - **CLI Power**:
    - `lux inspect <url>`: Preview Google Search results and Social Media cards in your terminal.
    - `lux repair`: Self-healing capability for the incremental LSM engine.
  - **Performance**: Support for streaming Gzip compression (`sitemap.xml.gz`).

  ## ⚠️ Upgrade Guide

  While most APIs remain backward compatible, this release is marked as major due to the significant architectural changes and potential behavior shifts in the XML generation output (new namespaces).

  - **Storage**: If you are implementing custom storage logic, you might need to adapt to the new `StorageAdapter` interface.
  - **Output**: The generated XML now includes `xmlns:image` and `xmlns:video` by default when these features are used.

## 1.0.0

### Minor Changes

- 71c0fa6: feat: implement true streaming sitemap generation, new CLI tools, and robots.txt builder.
