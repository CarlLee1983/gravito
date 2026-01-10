# Luminosity Improvement Goals (Q1 2026)

## 1. Rich Media SEO Support (High Priority)
Expand the XML builder to support Google's Image and Video sitemap extensions. This is crucial for media-heavy sites (e-commerce, news, streaming).

- [x] **Image Sitemap**: Support `<image:image>`, `<image:loc>`, `<image:caption>`.
- [x] **Video Sitemap**: Support `<video:video>`, `<video:thumbnail_loc>`, `<video:title>`, `<video:description>`.
- [x] **Type Definitions**: Update `SitemapEntry` interface to include `images[]` and `videos[]`.

## 2. Framework Ecosystem Expansion (Medium Priority)
Increase adoption by supporting more modern web frameworks.

- [x] **Remix Scanner**: Create `RemixScanner` to detect routes from `app/routes/*`.
- [x] **SvelteKit Scanner**: Create `SvelteKitScanner` (investigate `import.meta.glob` usage).
- [ ] **Fastify Scanner**: Create `FastifyScanner` (if feasible via plugin API).

## 3. Reliability & Maintenance (High Priority)
Enhance the robustness of the LSM-Tree storage engine.

- [x] **CLI Repair Command**: Add `luminosity repair` to fix corrupted `.jsonl` or `.json` snapshot files.
- [x] **Integrity Check**: Add a startup check to verify the consistency of the `storage/seo` directory.

## 4. Internationalization (i18n) (Medium Priority)
Ensure global sites are first-class citizens.

- [x] **Hreflang Helper**: Create a helper to easily generate `alternates` for `SitemapEntry` based on a locale list.
- [x] **Meta Tag Validation**: Ensure `SeoMetadata` correctly outputs `<link rel="alternate" hreflang="..." />` in the HTML head.

## 5. Documentation & Benchmarks (Low Priority)
- [x] **Translation**: specific technical docs (`LUMINOSITY_ENGINE.md`) to English.
- [ ] **Benchmark**: Create a specific benchmark script (1M pages) to verify `Compactor` memory usage.