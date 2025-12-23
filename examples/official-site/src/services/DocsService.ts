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

// biome-ignore lint/complexity/noStaticOnlyClass: Utility namespace for docs processing
export class DocsService {
  private static highlighter: any = null

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
            guide: '開發指南',
            start: '快速上手',
            structure: '專案結構',
            core: '核心概念',
            routing: '路由系統',
            template_engine: '樣版引擎 (Orbit View)',
            inertia: 'Inertia 全端開發 (React)',
            inertia_vue: 'Inertia 全端開發 (Vue)',
            seo: 'SmartMap SEO 引擎',
            i18n: '國際化 (I18n)',
            image: '圖片優化 (Image)',
            ssg: '靜態網站開發',
            deploy: '部署指南',
            api: 'API 參考',
            orbit_core: 'Core 核心',
            orbit_inertia: 'Orbit Inertia',
            orbit_seo: 'Orbit SEO',
          }
        : {
            guide: 'Guide',
            start: 'Getting Started',
            structure: 'Project Structure',
            core: 'Core Concepts',
            routing: 'Routing System',
            template_engine: 'Template Engine (Orbit View)',
            inertia: 'Inertia (Inertia-React)',
            inertia_vue: 'Inertia (Inertia-Vue)',
            seo: 'SmartMap SEO Engine',
            i18n: 'Internationalization',
            image: 'Image Optimization',
            ssg: 'Static Site Development',
            deploy: 'Deployment',
            api: 'API Reference',
            orbit_core: 'Core Kernel',
            orbit_inertia: 'Orbit Inertia',
            orbit_seo: 'Orbit SEO',
          }

    return [
      {
        title: trans.guide,
        path: '#',
        children: [
          { title: trans.start, path: `${prefix}/guide/getting-started` },
          { title: trans.structure, path: `${prefix}/guide/project-structure` },
          { title: trans.core, path: `${prefix}/guide/core-concepts` },
          { title: trans.routing, path: `${prefix}/guide/routing` },
          { title: trans.template_engine, path: `${prefix}/guide/template-engine` },
          { title: trans.inertia, path: `${prefix}/guide/inertia-react` },
          { title: trans.inertia_vue, path: `${prefix}/guide/inertia-vue` },
          { title: trans.seo, path: `${prefix}/guide/seo-engine` },
          { title: trans.i18n, path: `${prefix}/guide/i18n-guide` },
          { title: trans.image, path: `${prefix}/guide/image-optimization` },
          { title: trans.ssg, path: `${prefix}/guide/static-site-development` },
          { title: trans.deploy, path: `${prefix}/guide/deployment` },
        ],
      },
    ]
  }
}
