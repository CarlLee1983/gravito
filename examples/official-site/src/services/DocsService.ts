import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import type { MarkedOptions } from 'marked'
import { marked } from 'marked'
import { createHighlighter } from 'shiki'

// Use import.meta.dirname to be safe relative to this file
// /src/services/DocsService.ts
// -> /src/services (0)
// -> /src (1)
// -> /official-site (2)
// -> /examples (3)
// -> /@gravito/core (4)
// -> /@gravito/core/docs (Target)
const DOCS_ROOT = path.resolve(import.meta.dirname, '../../../../docs')

export interface DocPage {
  title: string
  content: string // HTML
  metadata: Record<string, unknown>
  toc: TocItem[]
}

export interface TocItem {
  id: string
  text: string
  level: number
}

export interface SidebarItem {
  title: string
  path: string
  children?: SidebarItem[]
}

import type { Highlighter } from 'shiki'

// biome-ignore lint/complexity/noStaticOnlyClass: Utility namespace for docs processing
export class DocsService {
  private static highlighter: Highlighter | null = null

  private static async getHighlighter() {
    if (!DocsService.highlighter) {
      DocsService.highlighter = await createHighlighter({
        themes: ['rose-pine-moon', 'github-dark'],
        langs: [
          'ts',
          'js',
          'bash',
          'json',
          'yaml',
          'markdown',
          'typescript',
          'html',
          'css',
          'dockerfile',
        ],
      })
    }
    return DocsService.highlighter
  }

  private static stripLeadingEmoji(value: string): string {
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: Emoji regex
    return value.replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D]+[\s]+/u, '').trim()
  }

  private static stripLeadingEmojiFromHeadingInnerHtml(value: string): string {
    // Headings are typically plain text at the start (e.g. "Title").
    // Keep this conservative: only remove leading emoji + whitespace.
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: Emoji regex
    return value.replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D]+[\s]+/u, '')
  }

  private static decodeHtmlEntities(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
  }

  private static stripHtmlTags(value: string): string {
    return value.replace(/<[^>]*>/g, '')
  }

  private static extractAndRemoveLeadingH1(html: string): { html: string; h1Text: string | null } {
    // The docs layout renders the page title already. Strip a leading H1 from the rendered Markdown
    // to avoid duplicated titles, while still allowing authors to keep an H1 in the source Markdown.
    const match = html.match(/^\s*<h1\b[^>]*>([\s\S]*?)<\/h1>\s*/i)
    if (!match) {
      return { html, h1Text: null }
    }

    const innerHtml = match[1] ?? ''
    const h1Text = DocsService.stripLeadingEmoji(
      DocsService.decodeHtmlEntities(DocsService.stripHtmlTags(String(innerHtml))).trim()
    )

    const stripped = html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, '')
    return { html: stripped, h1Text: h1Text || null }
  }

  private static slugifyHeading(text: string): string {
    const normalized = text
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, '-')
      .replace(/[^\p{L}\p{N}\u3400-\u9FFF-]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    return normalized
  }

  private static addHeadingIdsAndToc(html: string): { html: string; toc: TocItem[] } {
    const toc: TocItem[] = []
    const seen = new Map<string, number>()

    const withAnchors = html.replace(
      /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g,
      (full, levelRaw, attrsRaw, innerHtml) => {
        const level = Number(levelRaw)
        if (!Number.isFinite(level) || level < 1 || level > 6) {
          return full
        }
        if (level === 1) {
          return full
        }

        const existingIdMatch = String(attrsRaw).match(/\sid="([^"]+)"/)
        const existingClassMatch = String(attrsRaw).match(/\sclass="([^"]+)"/)

        const headingText = DocsService.stripLeadingEmoji(
          DocsService.decodeHtmlEntities(DocsService.stripHtmlTags(String(innerHtml))).trim()
        )

        const base =
          existingIdMatch?.[1] ||
          DocsService.slugifyHeading(headingText) ||
          `section-${toc.length + 1}`

        const count = (seen.get(base) ?? 0) + 1
        seen.set(base, count)
        const id = existingIdMatch?.[1] || (count === 1 ? base : `${base}-${count}`)

        if (headingText) {
          toc.push({ id, text: headingText, level })
        }

        const cleanedAttrs = String(attrsRaw)
          .replace(/\sid="[^"]*"/g, '')
          .replace(/\sclass="[^"]*"/g, '')

        const classes = new Set(
          [existingClassMatch?.[1], 'scroll-mt-24']
            .filter(Boolean)
            .flatMap((c) => String(c).split(/\s+/g))
            .filter(Boolean)
        )

        const classAttr = ` class="${Array.from(classes).join(' ')}"`
        const idAttr = ` id="${id}"`

        const cleanedInnerHtml = DocsService.stripLeadingEmojiFromHeadingInnerHtml(
          String(innerHtml)
        )
        return `<h${level}${cleanedAttrs}${idAttr}${classAttr}>${cleanedInnerHtml}</h${level}>`
      }
    )

    return { html: withAnchors, toc }
  }

  /**
   * Get parsed documentation page
   */
  static async getPage(locale: string, slug: string): Promise<DocPage | null> {
    const fsLocale = locale === 'zh' ? 'zh-TW' : 'en'
    const categories = [
      'getting-started',
      'architecture',
      'basics',
      'frontend',
      'security',
      'services',
      'advanced',
      'deployment',
      'specialized',
      'database',
    ]

    // Directories that do NOT have locale subfolders
    const sharedDirs = ['internal', 'spec', 'operations', 'benchmarks', 'sessions']

    let filePath = ''

    const slugParts = slug.split('/')

    // Priority 1: Check shared directories (root/shared/...)
    if (sharedDirs.includes(slugParts[0])) {
      filePath = path.join(DOCS_ROOT, `${slug}.md`)
    } else {
      // Priority 2: Categorized Guide docs (root/locale/guide/category/...)
      let cleanSlug = slug
      if (cleanSlug.startsWith('guide/')) {
        cleanSlug = cleanSlug.replace(/^guide\//, '')
      }

      const cleanSlugParts = cleanSlug.split('/')

      if (categories.includes(cleanSlugParts[0])) {
        filePath = path.join(DOCS_ROOT, fsLocale, 'guide', `${cleanSlug}.md`)
      } else {
        // Try to find which category the file belongs to
        let found = false
        for (const cat of categories) {
          const checkPath = path.join(DOCS_ROOT, fsLocale, 'guide', cat, `${cleanSlug}.md`)
          try {
            await fs.access(checkPath)
            filePath = checkPath
            found = true
            break
          } catch {}
        }

        if (!found) {
          // Fallback to direct path under locale (API docs, etc)
          filePath = path.join(DOCS_ROOT, fsLocale, `${slug}.md`)
        }
      }
    }

    // Fallback logic for English
    try {
      await fs.access(filePath)
    } catch {
      if (fsLocale !== 'en' && !sharedDirs.includes(slugParts[0])) {
        // Only fallback if not in shared directories (which are shared anyway)
        let fallbackSlug = slug
        if (fallbackSlug.startsWith('guide/')) {
          fallbackSlug = fallbackSlug.replace(/^guide\//, '')
        }

        const fallbackSlugParts = fallbackSlug.split('/')

        if (categories.includes(fallbackSlugParts[0])) {
          filePath = path.join(DOCS_ROOT, 'en', 'guide', `${fallbackSlug}.md`)
        } else {
          let foundFallback = false
          for (const cat of categories) {
            const checkPath = path.join(DOCS_ROOT, 'en', 'guide', cat, `${fallbackSlug}.md`)
            try {
              await fs.access(checkPath)
              filePath = checkPath
              foundFallback = true
              break
            } catch {}
          }
          if (!foundFallback) {
            filePath = path.join(DOCS_ROOT, 'en', `${slug}.md`)
          }
        }
      }
    }

    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const { data, content } = matter(raw)

      const highlighter = await DocsService.getHighlighter()

      const markedOptions = {
        async: true,
        highlight: (code: string, lang: string) => {
          return highlighter.codeToHtml(code, {
            lang: lang || 'text',
            theme: 'rose-pine-moon',
          })
        },
      } as MarkedOptions
      marked.setOptions(markedOptions)

      const escapeHtml = (str: string): string => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
      }

      const renderer = new marked.Renderer()

      const imageService = await import('@gravito/prism').then((m) => new m.ImageService())

      renderer.image = ({
        href,
        title,
        text,
      }: {
        href: string
        title?: string | null
        text: string
      }) => {
        try {
          if (!href.startsWith('http') && !href.startsWith('//')) {
            return imageService.generateImageTag({
              src: href,
              alt: text,
              usePicture: true,
              formatNegotiation: true,
            })
          }
        } catch (e) {
          console.warn(`[DocsService] Failed to optimize image: ${href}`, e)
        }

        return `<img src="${href}" alt="${text}"${title ? ` title="${title}"` : ''} />`
      }

      renderer.link = ({
        href,
        text,
        title,
      }: {
        href: string
        text: string
        title?: string | null
      }) => {
        let finalHref = href

        if (finalHref.endsWith('.md')) {
          finalHref = finalHref.replace(/\.md$/, '')
        }

        if (finalHref.startsWith('./') || finalHref.startsWith('../')) {
          const prefix = locale === 'zh' ? '/zh/docs' : '/en/docs'

          // Use path.join to resolve relative links within the slug context
          const slugDir = slug.includes('/') ? slug.split('/').slice(0, -1).join('/') : ''
          const resolvedPath = path.join(slugDir, finalHref)

          finalHref = `${prefix}/${resolvedPath}`
        } else if (
          !finalHref.startsWith('http') &&
          !finalHref.startsWith('/') &&
          !finalHref.startsWith('#')
        ) {
          const prefix = locale === 'zh' ? '/zh/docs' : '/en/docs'
          finalHref = `${prefix}/${finalHref}`
        }

        const escapedHref = escapeHtml(finalHref)
        const escapedTitle = title ? escapeHtml(title) : null

        return `<a href="${escapedHref}"${escapedTitle ? ` title="${escapedTitle}"` : ''}>${text}</a>`
      }

      renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
        if (lang === 'mermaid') {
          const configHeader = `%%{init: { 
            'theme': 'base', 
            'themeVariables': {
              'primaryColor': '#14f195',
              'primaryTextColor': '#000000',
              'primaryBorderColor': '#14f195',
              'lineColor': '#14f195',
              'secondaryColor': '#a855f7',
              'tertiaryColor': '#ffffff',
              'mainBkg': '#14f195',
              'nodeBorder': '#14f195',
              'clusterBkg': '#1e1e2e',
              'titleColor': '#ffffff',
              'edgeLabelBackground':'#1e1e2e',
              'nodeTextColor': '#000000'
            }
          }}%%`
          const config = `${configHeader}\n${text.trim()}`

          const encoded = Buffer.from(config).toString('base64')
          return `<div class="mermaid-container my-16 flex flex-col items-center group not-prose">
            <div class="relative p-12 rounded-[3rem] bg-void/80 border border-white/10 shadow-[0_0_80px_-20px_rgba(20,241,149,0.15)] transition-all duration-700 hover:border-singularity/40 hover:shadow-singularity/20 overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-br from-singularity/5 to-transparent pointer-events-none"></div>
              <img src="https://mermaid.ink/svg/${encoded}" alt="Architecture Diagram" class="relative z-10 max-w-full h-auto opacity-95 group-hover:opacity-100 transition-opacity" />
            </div>
            <div class="mt-8 flex items-center gap-4 opacity-20 group-hover:opacity-50 transition-all duration-1000">
               <div class="w-12 h-px bg-gradient-to-r from-transparent to-white"></div>
               <span class="text-[10px] font-black uppercase tracking-[0.4em] text-white italic">Gravito Architecture Engine_</span>
               <div class="w-12 h-px bg-gradient-to-l from-transparent to-white"></div>
            </div>
          </div>`
        }

        try {
          const language = lang || 'text'
          const highlighted = highlighter.codeToHtml(text, {
            lang: language,
            theme: 'rose-pine-moon',
          })

          return `
<div class="not-prose my-10 overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e2e]/80 backdrop-blur-xl shadow-2xl group/code relative">
  <div class="flex items-center justify-between border-b border-white/5 bg-white/5 px-5 py-3 select-none">
    <div class="flex items-center gap-2">
      <div class="flex gap-1.5">
        <div class="h-3 w-3 rounded-full bg-[#ff5f56] shadow-[0_0_10px_rgba(255,95,86,0.2)]"></div>
        <div class="h-3 w-3 rounded-full bg-[#ffbd2e] shadow-[0_0_10px_rgba(255,189,46,0.2)]"></div>
        <div class="h-3 w-3 rounded-full bg-[#27c93f] shadow-[0_0_10px_rgba(39,201,63,0.2)]"></div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 group-hover/code:text-singularity/50 transition-colors duration-500">
        ${language}
      </span>
    </div>
  </div>
  <div class="overflow-x-auto p-2 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
    <div class="[&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-4 [&_code]:!text-[13px] [&_code]:leading-relaxed font-mono">
      ${highlighted}
    </div>
  </div>
</div>`
        } catch (_e) {
          const _escapedText = escapeHtml(text)
          const _langClass = lang ? `language-${lang}` : ''
          return `<pre class="${_langClass}"><code class="${_langClass}">${_escapedText}</code></pre>`
        }
      }

      const html = (await marked.parse(content, { renderer })) as string
      const leading = DocsService.extractAndRemoveLeadingH1(html)
      const processed = DocsService.addHeadingIdsAndToc(leading.html)

      return {
        title: (data.title as string) || leading.h1Text || 'Untitled',
        content: processed.html,
        metadata: data as Record<string, unknown>,
        toc: processed.toc,
      }
    } catch (error) {
      console.error(`[DocsService] Failed to load docs: ${filePath}`, error)
      return null
    }
  }

  /**
   * Generate sidebar structure (Simplistic hardcoded version for v1)
   * In a real app, this would walk the directory.
   */
  static getSidebar(locale: string, customPrefix?: string): SidebarItem[] {
    const prefix = customPrefix || (locale === 'zh' ? '/zh/docs' : '/en/docs')
    const trans =
      locale === 'zh'
        ? {
            // Sections
            getting_started: '入門指南',
            core_concepts: '核心概念',
            first_build: '第一個專案',
            modules: '模組總覽',
            database: '資料庫基礎 (Database)',
            orm: 'Atlas ORM',
            auth: '驗證與安全',
            auth_fortify: '認證 (Fortify)',
            auth_sentinel: 'Sentinel Auth',
            storage: '儲存與檔案',
            nebula_storage: 'Nebula Storage',
            cache_queue: '快取與排程',
            plasma_redis: 'Plasma Redis',
            stasis_cache: 'Stasis Cache',
            seo: 'SEO 與 Sitemap',
            frontend: '前端整合',
            advanced: '進階與維運',
            testing: '測試指南',
            reference: '參考資料',
            queues: '佇列系統',

            // Pages
            intro: '簡介',
            quick_start: '快速上手',
            architectural_patterns: '架構模式 (Patterns)',
            structure: '專案結構',
            architecture: '銀河架構',
            lifecycle: '生命週期',
            ecosystem: '動力生態系',
            routing: '基礎路由',
            testing_harness: 'HTTP 測試',
            static_site: '靜態網站生成',
            photon_core: 'Photon Core',
            rest_api: 'REST API 開發',

            middleware: '中間件 (Middleware)',
            controllers: '控制器 (Controllers)',
            requests: '請求 (Requests)',
            responses: '回應 (Responses)',
            validation: '驗證 (Validation)',
            helpers: '輔助函式',

            // Database Pages
            db_overview: '概覽',
            db_quickstart: '快速入門 (Getting Started)',
            db_query: '查詢建構器 (Query Builder)',
            db_pagination: '資料分頁 (Pagination)',
            db_migrations: '資料庫遷移 (Migrations)',
            db_seeding: '數據填充 (Seeding)',
            db_redis: 'Redis 整合',
            db_mongodb: 'MongoDB 整合',

            // ORM Pages
            orm_getting_started: '快速上手',
            orm_relationships: '模型關聯 (Relationships)',
            orm_mutators: '修改器與轉換 (Mutators)',
            orm_serialization: '序列化 (Serialization)',
            orm_factories: '模型工廠 (Factories)',
            orm_collections: '集合 (Collections)',
            orm_resources: 'API 資源 (Resources)',
            orm_usage: 'ORM 使用指南',

            security: '安全機制',
            image_opt: '圖片優化',
            seo_overview: 'SEO 引擎概覽',
            route_scanner: '路由掃描器',
            sitemap_basic: 'Sitemap 基礎',
            inertia_react: 'Inertia (React)',
            inertia_vue: 'Inertia (Vue)',
            view_engine: 'Orbit View 引擎',
            i18n: '國際化 (I18n)',
            deployment: '正式環境部署',
            enterprise_integration: '企業級整合',
            official_site_arch: '官方網站架構',
            monitor: '觀察者系統 (Monitor)',
            cli: 'CLI 指令',
            plugins: '插件開發',
            beam_client: 'Beam 客戶端',
            flux_workflow: 'Flux 工作流程',
            forge_media: 'Forge 媒體處理',
            monolith_cms: 'Monolith CMS',
            scaffold_generator: 'Scaffold 專案生成器',
            site_toolkit: 'Site Toolkit',
            ripple_broadcasting: 'Ripple Broadcasting',
            freeze_react: 'Freeze React',
            freeze_vue: 'Freeze Vue',
            luminosity_cli: 'Luminosity CLI',
            create_app: 'Create Gravito App',
            graphql: 'GraphQL API',
            astral: 'Astral OpenAPI',
          }
        : {
            // Sections
            getting_started: 'Getting Started',
            core_concepts: 'Core Concepts',
            first_build: 'First Build',
            modules: 'Modules',
            database: 'Database',
            orm: 'Atlas ORM',
            auth: 'Auth & Security',
            auth_fortify: 'Authentication (Fortify)',
            auth_sentinel: 'Sentinel Auth',
            storage: 'Storage & Files',
            nebula_storage: 'Nebula Storage',
            cache_queue: 'Cache & Queue',
            plasma_redis: 'Plasma Redis',
            stasis_cache: 'Stasis Cache',
            seo: 'SEO & Sitemap',
            frontend: 'Frontend Integration',
            advanced: 'Advanced / Operations',
            testing: 'Testing',
            reference: 'Reference',
            queues: 'Queues',

            // Pages
            intro: 'Introduction',
            quick_start: 'Quick Start',
            architectural_patterns: 'Architectural Patterns',
            structure: 'Project Structure',
            architecture: 'Galaxy Architecture',
            lifecycle: 'Lifecycle',
            ecosystem: 'Kinetic Ecosystem',
            routing: 'Routing Basics',
            testing_harness: 'HTTP Testing',
            static_site: 'Static Site Gen',
            photon_core: 'Photon Core',
            rest_api: 'REST API Guide',

            middleware: 'Middleware',
            controllers: 'Controllers',
            requests: 'Requests',
            responses: 'Responses',
            validation: 'Validation',
            helpers: 'Helpers',

            // Database Pages
            db_overview: 'Overview',
            db_quickstart: 'Getting Started',
            db_query: 'Query Builder',
            db_pagination: 'Pagination',
            db_migrations: 'Migrations',
            db_seeding: 'Seeding & Factories',
            db_redis: 'Redis',
            db_mongodb: 'MongoDB',

            // ORM Pages
            orm_getting_started: 'Getting Started',
            orm_relationships: 'Relationships',
            orm_mutators: 'Mutators & Casting',
            orm_serialization: 'Serialization',
            orm_factories: 'Factories',
            orm_collections: 'Collections',
            orm_resources: 'API Resources',
            orm_usage: 'ORM Usage Guide',

            security: 'Security',
            image_opt: 'Image Optimization',
            seo_overview: 'SEO Engine Overview',
            route_scanner: 'RouteScanner',
            sitemap_basic: 'Sitemap Basics',
            inertia_react: 'Inertia (React)',
            inertia_vue: 'Inertia (Vue)',
            view_engine: 'Orbit View Engine',
            i18n: 'Internationalization',
            deployment: 'Production Deployment',
            enterprise_integration: 'Enterprise Integration',
            official_site_arch: 'Official Site Architecture',
            monitor: 'Monitoring (Monitor)',
            cli: 'CLI Commands',
            plugins: 'Plugin Development',
            beam_client: 'Beam Client',
            flux_workflow: 'Flux Workflow',
            forge_media: 'Forge Media',
            monolith_cms: 'Monolith CMS',
            scaffold_generator: 'Scaffold Generator',
            site_toolkit: 'Site Toolkit',
            ripple_broadcasting: 'Ripple Broadcasting',
            freeze_react: 'Freeze React',
            freeze_vue: 'Freeze Vue',
            luminosity_cli: 'Luminosity CLI',
            create_app: 'Create Gravito App',
            graphql: 'GraphQL API',
            astral: 'Astral OpenAPI',
          }

    return [
      {
        title: trans.getting_started,
        path: '#',
        children: [
          { title: trans.quick_start, path: `${prefix}/guide/getting-started/introduction` },
          { title: trans.architectural_patterns, path: `${prefix}/guide/specialized/cli-init` },
          { title: trans.structure, path: `${prefix}/guide/getting-started/project-structure` },
        ],
      },
      {
        title: trans.core_concepts,
        path: '#',
        children: [
          { title: trans.architecture, path: `${prefix}/guide/architecture/core-concepts` },
          {
            title: trans.official_site_arch,
            path: `${prefix}/guide/architecture/official-site-architecture`,
          },
          { title: trans.ecosystem, path: `${prefix}/guide/specialized/ecosystem` },
          // Placeholder for now
          // { title: trans.lifecycle, path: `${prefix}/guide/lifecycle` },
        ],
      },
      {
        title: trans.first_build,
        path: '#',
        children: [
          { title: trans.photon_core, path: `${prefix}/guide/architecture/photon-core` },
          { title: trans.routing, path: `${prefix}/guide/basics/routing` },
          { title: trans.rest_api, path: `${prefix}/guide/advanced/rest-api` },
          { title: trans.middleware, path: `${prefix}/guide/basics/middleware` },
          { title: trans.controllers, path: `${prefix}/guide/basics/controllers` },
          { title: trans.requests, path: `${prefix}/guide/basics/requests` },
          { title: trans.responses, path: `${prefix}/guide/basics/responses` },
          { title: trans.validation, path: `${prefix}/guide/basics/validation` },
          { title: trans.helpers, path: `${prefix}/guide/basics/helpers` },
          { title: trans.static_site, path: `${prefix}/guide/specialized/static-site-development` },
        ],
      },
      {
        title: trans.modules,
        path: '#',
        children: [
          { title: trans.plasma_redis, path: `${prefix}/guide/services/plasma-redis` },
          { title: trans.plugins, path: `${prefix}/guide/advanced/plugin-development` },
          { title: trans.beam_client, path: `${prefix}/guide/specialized/beam-client` },
          { title: trans.flux_workflow, path: `${prefix}/guide/architecture/flux-workflow` },
          { title: trans.forge_media, path: `${prefix}/guide/specialized/forge-media` },
          { title: trans.monolith_cms, path: `${prefix}/guide/specialized/monolith-cms` },
          { title: trans.scaffold_generator, path: `${prefix}/guide/advanced/scaffold-generator` },
          { title: trans.site_toolkit, path: `${prefix}/guide/advanced/site-toolkit` },
          {
            title: trans.ripple_broadcasting,
            path: `${prefix}/guide/services/ripple-broadcasting`,
          },
          { title: trans.freeze_react, path: `${prefix}/guide/frontend/freeze-react` },
          { title: trans.freeze_vue, path: `${prefix}/guide/frontend/freeze-vue` },
          { title: trans.luminosity_cli, path: `${prefix}/guide/specialized/pulse-cli` },
          { title: trans.create_app, path: `${prefix}/guide/getting-started/create-gravito-app` },
          { title: trans.graphql, path: `${prefix}/guide/advanced/graphql` },
          { title: trans.astral, path: `${prefix}/guide/specialized/astral` },
        ],
      },
      {
        title: trans.database,
        path: '#',
        children: [
          { title: trans.db_overview, path: `${prefix}/guide/database/overview` },
          { title: trans.db_quickstart, path: `${prefix}/guide/database/quick-start` },
          { title: trans.db_query, path: `${prefix}/guide/database/query-builder` },
          { title: trans.db_pagination, path: `${prefix}/guide/database/pagination` },
          { title: trans.db_migrations, path: `${prefix}/guide/database/migrations` },
          { title: trans.db_seeding, path: `${prefix}/guide/database/seeding` },
          { title: trans.db_redis, path: `${prefix}/guide/database/redis` },
          { title: trans.db_mongodb, path: `${prefix}/guide/database/mongodb` },
        ],
      },
      {
        title: trans.orm,
        path: '#',
        children: [
          { title: trans.orm_usage, path: `${prefix}/guide/database/orm-usage` },
          { title: trans.orm_getting_started, path: `${prefix}/guide/database/orm-quick-start` },
          { title: trans.orm_relationships, path: `${prefix}/guide/database/atlas-relationships` },
          { title: trans.orm_collections, path: `${prefix}/guide/database/atlas-collections` },
          { title: trans.orm_mutators, path: `${prefix}/guide/database/atlas-mutators` },
          { title: trans.orm_resources, path: `${prefix}/guide/database/atlas-resources` },
          { title: trans.orm_serialization, path: `${prefix}/guide/database/atlas-serialization` },
          { title: trans.orm_factories, path: `${prefix}/guide/database/atlas-factories` },
        ],
      },
      {
        title: trans.auth,
        path: '#',
        children: [
          { title: trans.auth_fortify, path: `${prefix}/guide/security/authentication` },
          { title: trans.auth_sentinel, path: `${prefix}/guide/security/sentinel-auth` },
          { title: trans.security, path: `${prefix}/guide/security/security` },
        ],
      },
      {
        title: trans.storage,
        path: '#',
        children: [
          { title: trans.nebula_storage, path: `${prefix}/guide/services/nebula-storage` },
          { title: trans.image_opt, path: `${prefix}/guide/frontend/image-optimization` },
        ],
      },
      {
        title: trans.cache_queue,
        path: '#',
        children: [
          { title: trans.stasis_cache, path: `${prefix}/guide/services/stasis-cache` },
          { title: trans.queues, path: `${prefix}/guide/services/queues` },
        ],
      },
      {
        title: trans.seo,
        path: '#',
        children: [
          { title: trans.seo_overview, path: `${prefix}/guide/specialized/seo-engine` },
          { title: trans.route_scanner, path: `${prefix}/guide/specialized/seo-route-scanner` },
          { title: trans.sitemap_basic, path: `${prefix}/guide/specialized/sitemap-guide` },
        ],
      },
      {
        title: trans.frontend,
        path: '#',
        children: [
          { title: trans.inertia_react, path: `${prefix}/guide/frontend/inertia-react` },
          { title: trans.inertia_vue, path: `${prefix}/guide/frontend/inertia-vue` },
          { title: trans.view_engine, path: `${prefix}/guide/frontend/template-engine` },
          { title: trans.i18n, path: `${prefix}/guide/specialized/i18n-guide` },
        ],
      },
      {
        title: trans.advanced,
        path: '#',
        children: [
          { title: trans.deployment, path: `${prefix}/guide/deployment/deployment` },
          {
            title: trans.enterprise_integration,
            path: `${prefix}/guide/advanced/enterprise-integration`,
          },
          { title: trans.monitor, path: `${prefix}/guide/deployment/monitor` },
        ],
      },
      {
        title: trans.testing,
        path: '#',
        children: [{ title: trans.testing_harness, path: `${prefix}/guide/deployment/testing` }],
      },
    ]
  }
}
