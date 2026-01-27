# Documentation Agent Instructions

Scope: `docs/**` (all documentation files under this directory).

Use these instructions whenever you create or edit documentation in this repository.

## Goals

- Keep docs **professional, consistent, and easy to scan**.
- Prefer **Markdown-first** authoring; avoid brittle raw HTML layouts.
- Keep **English** docs (`docs/en/**`) and **繁體中文（台灣）** docs (`docs/zh-TW/**`) consistent in meaning and structure.
- Avoid decorative emoji in headings and prose; keep tone product-grade.
- **Architecture Integrity**: Ensure all documentation reflects the **Galaxy Architecture** (Core-Orbit-Satellite) and **MDD** (Manifest-Driven Development) patterns.

## Language (繁體中文／台灣用語)

When writing Traditional Chinese docs, use Taiwan-standard terminology and avoid Mainland wording.

**Preferred → Avoid**

- `電腦` → `計算機`
- `網路` → `網絡`
- `資訊` → `信息`
- `軟體` → `軟件`
- `資料` → `數據`
- `預設` → `默認/默认`
- `模組` → `模块`
- `函式` → `函數`
- `變數` → `變量`
- `使用者` → `用戶`
- `伺服器` → `服務器/服务器`
- `日誌` → `日志`
- `環境變數` → `環境变量`
- `外掛` → `插件`
- `發佈` → `發布`
- `文件` → `文檔`

If the UI text uses a specific term (e.g. `外掛`), keep docs aligned with it.

## Architecture Guidelines (Galaxy v1.0)

When documenting features or modules, classify them correctly:

1. **PlanetCore (@gravito/core)**: The micro-kernel (IoC, Lifecycle, Hooks, EventBus).
2. **Orbits (Infrastructure)**: Strategic extensions (Database: Atlas, Mail: Signal, Frontend Bridge: Ion).
3. **Satellites (Domain)**: Business modules (Catalog, Membership, Commerce) following DDD/Clean Architecture.

### Core Patterns to Mention
- **Manifest-Driven Development (MDD)**: Assembling apps via `gravito.config.ts`.
- **Use Cases**: Encapsulating business logic via `@gravito/enterprise` base classes.
- **IoC/DI**: Resolving services via `c.get()` or `container.make()`.

## Structure

- Every doc page should start with frontmatter:
  - `title: ...`
- Use a single `#` (H1) title that matches the frontmatter title.
- Prefer the heading hierarchy:
  - `##` major sections
  - `###` subsections
  - Avoid going deeper than `####` unless necessary.
- Keep section intros to 1–3 lines; move detail into bullets, tables, or code blocks.

## Formatting

### Markdown (preferred)

- Use Markdown tables for comparisons, matrices, and quick references.
- Use numbered lists for procedures; keep steps imperative and concrete.
- Use fenced code blocks with a language tag (`bash`, `ts`, `json`, etc.).

### Callouts

We don’t have a dedicated admonition plugin; use a blockquote with a label:

```
> **Note**: ...
> **Warning**: ...
> **Tip**: ...
```

### Raw HTML (use sparingly)

Raw HTML is allowed, but it can break rendering if formatted poorly.

- Prefer Markdown alternatives first.
- If HTML is necessary (e.g. a Tailwind “card” layout), keep it as **one left-aligned block**:
  - No leading indentation
  - Surrounded by blank lines
  - Avoid mixing with Markdown lists/tables without a blank line boundary
- Do not rely on complex nested HTML unless you also verify it renders correctly in the site.

## Content Quality Checklist

Before finalizing a doc change:

- **Galaxy Compliance**: Does the terminology match the Core-Orbit-Satellite hierarchy?
- **MDD Consistency**: If applicable, is the `gravito.config.ts` pattern mentioned?
- No broken links; prefer repo-relative links where possible.
- Code samples match current 1.0 APIs and compile conceptually.
- Terms are consistent (especially zh-TW vocabulary).
- Headings are unique and descriptive.
- Tables render on mobile (keep columns narrow; avoid huge inline code).
- Avoid marketing fluff; explain “what/why/how” with concrete examples.

## Prompt Template (for future AI runs)

When asked to improve docs, follow this process:

1. Identify target pages and their audience (beginner vs advanced).
2. Verify architecture context (Core, Orbit, or Satellite?).
3. Normalize structure (frontmatter + H1 + consistent sections).
4. Replace brittle HTML with Markdown where possible; keep only minimal HTML.
5. Standardize terminology (zh-TW and English), then tighten wording.
6. Ensure examples are correct and runnable (1.0 syntax); add language tags.
7. Verify rendering in the official-site docs view.

