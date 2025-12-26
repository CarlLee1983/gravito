import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'

const DOCS_ROOT = join(import.meta.dirname, '../../docs')

export interface DocPage {
  title: string
  content: string
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
  href?: string
  items?: SidebarItem[]
}

interface SidebarSection {
  title: string
  items: SidebarItem[]
}

import type { Highlighter } from 'shiki'

// ...
class DocsServiceImpl {
  private highlighter: Highlighter | null = null

  async getHighlighter() {
    if (!this.highlighter) {
      const { createHighlighter } = await import('shiki')
      this.highlighter = await createHighlighter({
        themes: ['github-dark', 'github-light'],
        langs: ['typescript', 'javascript', 'bash', 'json', 'yaml', 'html', 'css'],
      })
    }
    return this.highlighter
  }

  async getDoc(slug: string, locale = 'en') {
    const filePath = join(process.cwd(), 'docs', locale, `${slug}.md`)

    try {
      const fileContent = await readFile(filePath, 'utf-8')
      const { data, content } = matter(fileContent)

      const highlighter = await this.getHighlighter()

      const renderer = new marked.Renderer()
      // marked 17.x passes an object { text, lang, escaped } to renderer.code
      renderer.code = ({ text, lang }: { text: string; lang?: string; escaped?: boolean }) => {
        const language = lang || 'text'
        const highlighted = highlighter.codeToHtml(text, { lang: language, theme: 'github-dark' })

        return `
<div class="not-prose my-14 group/code relative">
  <!-- Ambient Shadow/Glow Background -->
  <div class="absolute -inset-3 bg-gradient-to-tr from-emerald-500/5 via-transparent to-blue-500/5 rounded-[2.5rem] blur-3xl opacity-50 group-hover/code:opacity-100 transition-opacity duration-1000"></div>
  
  <!-- Terminal Window Container -->
  <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#080A0F] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/5">
    <!-- Terminal Header -->
    <div class="flex items-center justify-between border-b border-white/5 bg-white/[0.03] px-5 py-3.5 select-none">
      <div class="flex items-center gap-2">
        <div class="flex gap-1.5">
          <div class="h-3 w-3 rounded-full bg-[#ff5f56] shadow-[0_0_12px_rgba(255,95,86,0.4)]"></div>
          <div class="h-3 w-3 rounded-full bg-[#ffbd2e] shadow-[0_0_12px_rgba(255,189,46,0.4)]"></div>
          <div class="h-3 w-3 rounded-full bg-[#27c93f] shadow-[0_0_12px_rgba(39,201,63,0.4)]"></div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 group-hover/code:text-emerald-400 transition-colors duration-500">
          ${language}
        </span>
      </div>
    </div>

    <!-- Code Content -->
    <div class="overflow-x-auto p-3 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
      <div class="[&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-4 [&_code]:!text-[13px] [&_code]:leading-relaxed font-mono selection:bg-emerald-500/20">
        ${highlighted}
      </div>
    </div>
  </div>
</div>`
      }

      const html = await marked.parse(content, { renderer })

      return {
        meta: data,
        content: html,
        slug,
        locale,
      }
    } catch (e) {
      console.error(`Error reading doc: ${filePath}`, e)
      return null
    }
  }

  async getSidebar(locale = 'en'): Promise<SidebarSection[]> {
    const docsDir = join(DOCS_ROOT, locale)

    try {
      const entries = await readdir(docsDir, { withFileTypes: true })
      const pages: { title: string; href: string; order: number }[] = []

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const filePath = join(docsDir, entry.name)
          const content = await readFile(filePath, 'utf-8')
          const { data } = matter(content)
          const slug = entry.name.replace('.md', '')

          pages.push({
            title: (data.title as string) || slug,
            href: `/${locale === 'en' ? '' : `${locale}/`}docs/${slug}`,
            order: (data.order as number) || 999,
          })
        }
      }

      pages.sort((a, b) => a.order - b.order)

      return [
        {
          title: locale === 'zh' ? '指南' : 'Guide',
          items: pages.map(({ title, href }) => ({ title, href })),
        },
      ]
    } catch (e) {
      console.error(`Error generating sidebar for ${locale}:`, e)
      return []
    }
  }
}

export const DocsService = new DocsServiceImpl()
