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
// -> /gravito-core (4)
// -> /gravito-core/docs (Target)
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
        langs: ['ts', 'js', 'bash', 'json', 'yaml', 'markdown', 'typescript', 'html', 'css'],
      })
    }
    return DocsService.highlighter
  }

  private static stripLeadingEmoji(value: string): string {
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: Emoji regex
    return value.replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D]+[\s]+/u, '').trim()
  }

  private static stripLeadingEmojiFromHeadingInnerHtml(value: string): string {
    // Headings are typically plain text at the start (e.g. "📚 Title").
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
    // Handle locale mapping (zh -> zh-TW, en -> en)
    const fsLocale = locale === 'zh' ? 'zh-TW' : 'en'

    // Construct file path: docs/{locale}/{slug}.md
    const filePath = path.join(DOCS_ROOT, fsLocale, `${slug}.md`)

    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const { data, content } = matter(raw)

      // Get singleton highlighter
      const highlighter = await DocsService.getHighlighter()

      // Configure marked with shiki
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

      // Helper to escape HTML
      const escapeHtml = (str: string): string => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
      }

      // Add custom renderer for code blocks and links
      const renderer = new marked.Renderer()

      // Transform Markdown links to SPA routes
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

        // 1. Handle .md relative links (e.g., ./routing.md -> routing)
        if (finalHref.endsWith('.md')) {
          finalHref = finalHref.replace(/\.md$/, '')
        }

        // 2. Ensure relative paths work within the /docs/ context
        if (finalHref.startsWith('./')) {
          const currentDir = slug.includes('/') ? slug.split('/').slice(0, -1).join('/') : ''
          const target = finalHref.replace(/^\.\//, '')
          const prefix = locale === 'zh' ? '/zh/docs' : '/en/docs'
          finalHref = currentDir ? `${prefix}/${currentDir}/${target}` : `${prefix}/${target}`
        } else if (finalHref.startsWith('../')) {
          // Basic parent dir support
          const prefix = locale === 'zh' ? '/zh/docs' : '/en/docs'
          finalHref = finalHref.replace(/^\.\.\//, `${prefix}/`)
        } else if (
          !finalHref.startsWith('http') &&
          !finalHref.startsWith('/') &&
          !finalHref.startsWith('#')
        ) {
          // Case: "routing" instead of "./routing"
          const prefix = locale === 'zh' ? '/zh/docs' : '/en/docs'
          finalHref = `${prefix}/${finalHref}`
        }

        // Escape href and title for HTML attributes
        const escapedHref = escapeHtml(finalHref)
        const escapedTitle = title ? escapeHtml(title) : null

        return `<a href="${escapedHref}"${escapedTitle ? ` title="${escapedTitle}"` : ''}>${text}</a>`
      }

      renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
        if (lang === 'mermaid') {
          // Wrap in custom Singularity theme config
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

        // Use simple pre/code structure without external wrapper
        const escapedText = escapeHtml(text)
        const langClass = lang ? `language-${lang}` : ''

        return `<pre class="${langClass}"><code class="${langClass}">${escapedText}</code></pre>`
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
  static getSidebar(locale: string): SidebarItem[] {
    const prefix = locale === 'zh' ? '/zh/docs' : '/en/docs'
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
          storage: '儲存與檔案',
          cache_queue: '快取與排程',
          seo: 'SEO 與 Sitemap',
          frontend: '前端整合',
          advanced: '進階與維運',
          testing: '測試指南',
          reference: '參考資料',

          // Pages
          intro: '簡介',
          quick_start: '快速上手',
          structure: '專案結構',
          architecture: 'Galaxy 架構',
          lifecycle: '生命週期',
          routing: '基礎路由',
          testing_harness: 'HTTP 測試',
          static_site: '靜態網站生成',

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

          security: '安全機制',
          image_opt: '圖片優化',
          seo_engine: 'Luminosity 引擎',
          sitemap: 'Sitemap 生成',
          inertia_react: 'Inertia (React)',
          inertia_vue: 'Inertia (Vue)',
          view_engine: 'Orbit View 引擎',
          i18n: '國際化 (I18n)',
          deployment: '部署指南',
          cli: 'CLI 指令',
          plugins: '插件開發',
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
          storage: 'Storage & Files',
          cache_queue: 'Cache & Queue',
          seo: 'SEO & Sitemap',
          frontend: 'Frontend Integration',
          advanced: 'Advanced / Operations',
          testing: 'Testing',
          reference: 'Reference',

          // Pages
          intro: 'Introduction',
          quick_start: 'Quick Start',
          structure: 'Project Structure',
          architecture: 'Galaxy Architecture',
          lifecycle: 'Lifecycle',
          routing: 'Routing Basics',
          testing_harness: 'HTTP Testing',
          static_site: 'Static Site Gen',

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

          security: 'Security',
          image_opt: 'Image Optimization',
          seo_engine: 'Luminosity Engine',
          sitemap: 'Sitemap Generation',
          inertia_react: 'Inertia (React)',
          inertia_vue: 'Inertia (Vue)',
          view_engine: 'Orbit View Engine',
          i18n: 'Internationalization',
          deployment: 'Deployment',
          cli: 'CLI Commands',
          plugins: 'Plugin Development',
        }

    return [
      {
        title: trans.getting_started,
        path: '#',
        children: [
          { title: trans.quick_start, path: `${prefix}/guide/getting-started` },
          { title: trans.structure, path: `${prefix}/guide/project-structure` },
        ],
      },
      {
        title: trans.core_concepts,
        path: '#',
        children: [
          { title: trans.architecture, path: `${prefix}/guide/core-concepts` },
          // Placeholder for now
          // { title: trans.lifecycle, path: `${prefix}/guide/lifecycle` },
        ],
      },
      {
        title: trans.first_build,
        path: '#',
        children: [
          { title: trans.routing, path: `${prefix}/guide/routing` },
          { title: trans.static_site, path: `${prefix}/guide/static-site-development` },
        ],
      },
      {
        title: trans.modules,
        path: '#',
        children: [{ title: trans.plugins, path: `${prefix}/guide/plugin-development` }],
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
          { title: trans.orm_getting_started, path: `${prefix}/guide/database/orm-quick-start` },
          { title: trans.orm_relationships, path: `${prefix}/guide/database/atlas-relationships` },
          { title: trans.orm_mutators, path: `${prefix}/guide/database/atlas-mutators` },
          { title: trans.orm_serialization, path: `${prefix}/guide/database/atlas-serialization` },
          { title: trans.orm_factories, path: `${prefix}/guide/database/atlas-factories` },
          { title: trans.orm_collections, path: `${prefix}/guide/database/atlas-collections` },
          { title: trans.orm_resources, path: `${prefix}/guide/database/atlas-resources` },
        ],
      },
      {
        title: trans.auth,
        path: '#',
        children: [
          { title: trans.auth_fortify, path: `${prefix}/guide/authentication` },
          { title: trans.security, path: `${prefix}/guide/security` },
        ],
      },
      {
        title: trans.storage,
        path: '#',
        children: [{ title: trans.image_opt, path: `${prefix}/guide/image-optimization` }],
      },
      {
        title: trans.seo,
        path: '#',
        children: [
          { title: trans.seo_engine, path: `${prefix}/guide/seo-engine` },
          { title: trans.sitemap, path: `${prefix}/guide/sitemap-guide` },
        ],
      },
      {
        title: trans.frontend,
        path: '#',
        children: [
          { title: trans.inertia_react, path: `${prefix}/guide/inertia-react` },
          { title: trans.inertia_vue, path: `${prefix}/guide/inertia-vue` },
          { title: trans.view_engine, path: `${prefix}/guide/template-engine` },
          { title: trans.i18n, path: `${prefix}/guide/i18n-guide` },
        ],
      },
      {
        title: trans.advanced,
        path: '#',
        children: [{ title: trans.deployment, path: `${prefix}/guide/deployment` }],
      },
      {
        title: trans.testing,
        path: '#',
        children: [{ title: trans.testing_harness, path: `${prefix}/guide/testing` }],
      },
    ]
  }
}
