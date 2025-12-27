import { Head, router, usePage } from '@inertiajs/react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { ChevronRight, Clock, MapPin } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { isStaticSite, StaticLink } from '../components/StaticLink'
import { useTrans } from '../hooks/useTrans'

interface SidebarItem {
  title: string
  path: string
  children?: SidebarItem[]
}

interface TocItem {
  id: string
  text: string
  level: number
}

type Translation = Record<string, Record<string, string>>

interface DocsProps {
  [key: string]: unknown
  title: string
  content: string
  sidebar: SidebarItem[]
  currentPath: string
  toc: TocItem[]
  editUrl?: string
  locale?: string
  t?: Translation
}

export default function Docs() {
  const { trans } = useTrans()
  const props = usePage<DocsProps>().props
  const { title, content, sidebar, currentPath, toc, editUrl, locale } = props
  const isZh = locale === 'zh'
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tocVisible, setTocVisible] = useState(true)

  // Handle TOC anchor click with smooth scrolling
  const scrollToAnchor = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Update URL hash without triggering navigation
      window.history.pushState(null, '', `#${id}`)
    }
  }

  // Scroll Progress
  const { scrollYProgress } = useScroll()
  const _scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  const tocItems = useMemo(() => {
    return Array.isArray(toc) ? toc.filter((item) => item.level >= 2 && item.level <= 4) : []
  }, [toc])

  useEffect(() => {
    const root = contentRef.current
    if (!root) {
      return
    }
    if (!content) {
      return
    }

    // Enhance code blocks with copy button and window controls (Mac terminal style)
    const pres = Array.from(root.querySelectorAll('pre'))
    for (const pre of pres) {
      const existingWrapper = pre.closest('[data-pre-wrapper="true"]')
      if (existingWrapper) {
        continue
      }

      const wrapper = document.createElement('div')
      wrapper.dataset.preWrapper = 'true'
      wrapper.className =
        'relative group my-10 overflow-hidden rounded-2xl border border-white/20 bg-gray-900/80 backdrop-blur shadow-2xl transition-all hover:border-singularity/40'

      // Add "Console" Header (Mac terminal style)
      const header = document.createElement('div')
      header.className = 'flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/10'
      header.innerHTML = `
        <div class="flex gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div>
        </div>
        <div class="ml-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 italic">Gravito Console</div>
      `
      wrapper.appendChild(header)

      const parent = pre.parentNode
      if (!parent) {
        continue
      }

      parent.insertBefore(wrapper, pre)
      wrapper.appendChild(pre)

      pre.classList.add(
        'pr-14',
        '!bg-transparent',
        '!m-0',
        '!p-6',
        'overflow-x-auto',
        'h-scrollbar'
      )

      const button = document.createElement('button')
      button.type = 'button'
      button.className =
        'absolute top-2.5 right-3 rounded-md border border-gray-700/60 bg-gray-900/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-300 opacity-0 backdrop-blur transition-all hover:bg-singularity hover:text-black focus:opacity-100 group-hover:opacity-100 z-20'
      button.textContent = 'Copy'

      button.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? ''
        try {
          await navigator.clipboard.writeText(code)
          button.textContent = 'Copied'
          window.setTimeout(() => {
            button.textContent = 'Copy'
          }, 1200)
        } catch {
          button.textContent = 'Failed'
          window.setTimeout(() => {
            button.textContent = 'Copy'
          }, 1200)
        }
      })

      wrapper.appendChild(button)
    }

    // Add anchor links to headings
    const headings = Array.from(root.querySelectorAll('h2, h3, h4'))
    for (const h of headings as HTMLElement[]) {
      if (h.querySelector('.anchor-link')) {
        continue
      }

      const id = h.id
      if (!id) {
        continue
      }

      const anchor = document.createElement('a')
      anchor.href = `#${id}`
      anchor.className =
        'anchor-link ml-2 opacity-0 group-hover/h:opacity-100 transition-opacity text-singularity/40 hover:text-singularity'
      anchor.innerHTML = '#'
      anchor.onclick = (e) => {
        e.preventDefault()
        const element = document.getElementById(id)
        element?.scrollIntoView({ behavior: 'smooth' })
        window.history.pushState(null, '', `#${id}`)
      }

      h.classList.add('group/h', 'relative')
      h.appendChild(anchor)
    }

    // Wrap tables for horizontal scrolling on small screens
    const tables = Array.from(root.querySelectorAll('table'))
    for (const table of tables) {
      const parent = table.parentElement
      if (parent?.dataset.tableWrapper === 'true') {
        continue
      }

      const wrapper = document.createElement('div')
      wrapper.dataset.tableWrapper = 'true'
      wrapper.className =
        'not-prose docs-table-wrapper overflow-x-auto h-scrollbar my-12 rounded-2xl border border-white/5 bg-white/[0.02]'

      parent?.insertBefore(wrapper, table)
      wrapper.appendChild(table)

      table.className = 'docs-table min-w-[600px] md:min-w-full'

      // Add specific type-cell class to the second column for technical parameter tables
      const rows = Array.from(table.rows)
      for (const row of rows) {
        if (row.cells.length >= 2) {
          row.cells[1].classList.add('type-cell')
        }
      }
    }
  }, [content])

  useEffect(() => {
    const root = contentRef.current
    if (!root) {
      return
    }
    if (!content) {
      return
    }
    if (tocItems.length === 0) {
      return
    }

    const headingElements = tocItems
      .map((item) => root.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`))
      .filter(Boolean) as HTMLElement[]

    if (headingElements.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) {
          return
        }

        visible.sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
        const id = (visible[0].target as HTMLElement).id
        setActiveId(id || null)
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: [0, 1] }
    )

    for (const el of headingElements) {
      observer.observe(el)
    }
    return () => observer.disconnect()
  }, [tocItems, content])

  // SPA Link Interceptor: Prevent full page reload for internal docs links
  useEffect(() => {
    const root = contentRef.current
    if (!root) {
      return
    }

    const handleInternalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      if (link && link instanceof HTMLAnchorElement) {
        const href = link.getAttribute('href')
        const isExternal = href?.startsWith('http') || link.target === '_blank'
        const isAnchor = href?.startsWith('#')

        if (href && !isExternal && !isAnchor) {
          if (isStaticSite()) {
            return // Let browser handle it for static site
          }
          e.preventDefault()
          router.visit(href)
        }
      }
    }

    root.addEventListener('click', handleInternalClick)
    return () => root.removeEventListener('click', handleInternalClick)
  }, [])

  return (
    <Layout>
      <Head>
        <title>{`${title} | Gravito Docs`}</title>
        <meta name="description" content={trans('site.description')} />
      </Head>

      {/* Architectural Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Grainy Noise Overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Blueprint Grid - Extremely subtle dots */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Static Ambient Beams - Creating depth without distraction */}
        <div className="absolute top-0 left-1/4 w-[1px] h-screen bg-gradient-to-b from-transparent via-singularity/5 to-transparent shadow-[0_0_20px_rgba(0,240,255,0.02)]" />
        <div className="absolute top-0 right-1/4 w-[1px] h-screen bg-gradient-to-b from-transparent via-purple-500/5 to-transparent shadow-[0_0_20px_rgba(168,85,247,0.02)]" />

        {/* Top Horizon Glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-screen-2xl px-6 py-10 lg:flex lg:gap-14 relative z-10">
        <aside className="hidden lg:block lg:w-72 lg:shrink-0 relative">
          <div className="sticky top-28 h-[calc(100vh-10rem)] overflow-y-auto scrollbar-hide pr-4 -mr-4 space-y-12">
            {/* Search Mockup - Architectural Console Style */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-singularity/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <div className="relative bg-void border border-white/5 rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
                <div className="w-2 h-2 rounded-full bg-singularity animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 italic">
                  Universal Search_
                </span>
                <div className="ml-auto px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-mono text-gray-600">
                  ⌘K
                </div>
              </div>
            </div>

            {sidebar.map((section) => (
              <div key={section.title} className="relative">
                {/* Section Connector Line */}
                <div className="absolute -left-[13px] top-0 bottom-0 w-[1px] bg-gradient-to-b from-white/10 via-transparent to-transparent" />

                <h3 className="font-bold text-white mb-6 uppercase tracking-[0.2em] text-[11px] opacity-50 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full border border-white/20 flex items-center justify-center">
                    <div className="w-0.5 h-0.5 bg-current rounded-full" />
                  </span>
                  {section.title}
                </h3>
                <ul className="space-y-1 ml-1">
                  {section.children?.map((item) => {
                    const normalizePath = (p: string) => p.replace(/^\/zh-TW\//, '/zh/')
                    const isActive = normalizePath(currentPath) === normalizePath(item.path)
                    return (
                      <li key={item.path}>
                        <StaticLink
                          href={item.path}
                          className={`block text-sm py-3 px-6 transition-all duration-300 relative group font-medium rounded-xl border border-transparent ${
                            isActive
                              ? 'text-singularity font-bold border-white/5 bg-white/[0.03] shadow-[0_0_20px_rgba(20,241,149,0.05)]'
                              : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active-dot"
                                className="w-1 h-1 rounded-full bg-singularity shadow-[0_0_8px_#14f195]"
                              />
                            )}
                            <span
                              className={
                                isActive
                                  ? 'translate-x-0'
                                  : 'group-hover:translate-x-1 transition-transform'
                              }
                            >
                              {item.title}
                            </span>
                          </div>

                          {/* Indicator for current page */}
                          {isActive && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                              <MapPin size={12} />
                            </div>
                          )}
                        </StaticLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}

            {/* Version Teaser */}
            <div className="pt-10 border-t border-white/5 opacity-30 group cursor-help">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2">
                Build Stage
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-bold italic uppercase tracking-tighter">
                  Singularity v1.0.4
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 relative">
          {/* Reading Progress Bar - Move outside transformed container for true fixed positioning */}
          <motion.div
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-singularity via-cyan-400 to-purple-500 origin-left z-[9999] shadow-[0_0_15px_rgba(0,240,255,0.5)]"
            style={{ scaleX: _scaleX }}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="group/panel bg-panel/10 border border-white/5 rounded-[40px] p-8 md:p-14 backdrop-blur-2xl shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)] relative overflow-hidden"
          >
            {/* Internal Panel Details */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover/panel:opacity-100 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

            <header className="mb-14 relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <StaticLink
                    href={isZh ? '/zh' : '/'}
                    className="hover:text-white transition-colors"
                  >
                    GRAVITO
                  </StaticLink>
                  <ChevronRight size={10} className="opacity-20" />
                  <span className="text-singularity/60">{trans('nav.docs', 'Docs')}</span>
                  <ChevronRight size={10} className="opacity-20" />
                  <span className="text-white/40">{title}</span>
                </nav>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white leading-[0.9] mb-8">
                    {title}
                  </h1>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1 bg-gradient-to-r from-singularity to-transparent" />
                    <div className="w-4 h-1 bg-singularity/20" />
                    <div className="w-1 h-1 bg-singularity/10" />
                  </div>
                </div>

                {tocItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTocVisible((v) => !v)}
                    className="hidden xl:flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all backdrop-blur-md active:scale-95 group shadow-lg"
                    aria-expanded={tocVisible}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-all duration-500 ${tocVisible ? 'bg-singularity shadow-[0_0_15px_rgba(0,240,255,1)] scale-110' : 'bg-white/20'}`}
                    />
                    <span>
                      {tocVisible
                        ? isZh
                          ? '隱藏目錄'
                          : 'Hide TOC'
                        : isZh
                          ? '顯示目錄'
                          : 'Show TOC'}
                    </span>
                  </button>
                )}
              </div>
            </header>

            {tocItems.length > 0 && (
              <details className="not-prose mb-12 rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-sm backdrop-blur-xl xl:hidden group/mobile-toc">
                <summary className="cursor-pointer select-none font-black italic uppercase tracking-widest text-white/60 group-open/mobile-toc:text-singularity transition-colors">
                  {isZh ? '本頁目錄 / CONTENT' : 'ON THIS PAGE'}
                </summary>
                <nav aria-label="Table of contents" className="mt-6">
                  <ul className="space-y-3">
                    {tocItems.map((item) => {
                      const indent =
                        item.level === 3
                          ? 'pl-4 border-l border-white/5 ml-1'
                          : item.level === 4
                            ? 'pl-8 border-l border-white/5 ml-1'
                            : ''
                      return (
                        <li key={item.id} className={indent}>
                          <a
                            href={`#${item.id}`}
                            onClick={(e) => scrollToAnchor(e, item.id)}
                            className="block rounded-lg px-3 py-2 leading-snug text-gray-400 hover:bg-singularity/10 hover:text-singularity transition-all"
                          >
                            {item.text}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              </details>
            )}

            <div
              ref={contentRef}
              className="
                                prose prose-invert prose-lg max-w-none
                                prose-headings:italic prose-headings:tracking-tighter prose-headings:font-black
                                prose-h1:text-white
                                prose-h2:text-4xl prose-h2:text-white prose-h2:border-l-4 prose-h2:border-singularity prose-h2:pl-6 prose-h2:mt-24 prose-h2:mb-10 prose-h2:bg-gradient-to-r prose-h2:from-singularity/5 prose-h2:to-transparent prose-h2:py-4 prose-h2:rounded-r-2xl
                                prose-h3:text-2xl prose-h3:text-white/90 prose-h3:mt-16 prose-h3:mb-6 prose-h3:flex prose-h3:items-center prose-h3:gap-3
                                prose-a:font-bold prose-a:text-singularity hover:prose-a:text-cyan-300 transition-colors
                                prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-8 prose-p:font-medium
                                prose-pre:bg-transparent prose-pre:border-0 prose-pre:rounded-2xl prose-pre:shadow-none
                                prose-strong:text-white prose-strong:font-black
                                prose-hr:border-white/5 prose-hr:my-20
                                prose-blockquote:border-singularity prose-blockquote:bg-singularity/5 prose-blockquote:py-2 prose-blockquote:px-8 prose-blockquote:rounded-r-2xl prose-blockquote:italic prose-blockquote:text-gray-300
                                prose-li:text-gray-300 prose-li:mb-2
                                prose-img:rounded-[2rem] prose-img:border prose-img:border-white/10 prose-img:shadow-2xl
                               "
              // biome-ignore lint/security/noDangerouslySetInnerHtml: docs markdown is treated as trusted content in this example site
              dangerouslySetInnerHTML={{ __html: content }}
            />

            <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-gray-500">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Documentation
                  </div>
                  <div className="text-xs font-medium italic">
                    Powered by Gravito Singularity Engine
                  </div>
                </div>
              </div>
            </div>

            {/* Next/Prev Navigation */}
            {(() => {
              const flatItems = sidebar.flatMap((s) => s.children || [])
              const currentIndex = flatItems.findIndex((item) => item.path === currentPath)
              const prev = currentIndex > 0 ? flatItems[currentIndex - 1] : null
              const next = currentIndex < flatItems.length - 1 ? flatItems[currentIndex + 1] : null

              if (!prev && !next) {
                return null
              }

              return (
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  {prev ? (
                    <StaticLink
                      href={prev.path}
                      className="group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-singularity/30 transition-all flex flex-col items-start gap-4"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 flex items-center gap-2">
                        <ChevronRight size={12} className="rotate-180" />
                        {isZh ? '上一頁' : 'Previous'}
                      </span>
                      <span className="text-lg font-black italic text-gray-400 group-hover:text-white transition-colors">
                        {prev.title}
                      </span>
                    </StaticLink>
                  ) : (
                    <div />
                  )}

                  {next ? (
                    <StaticLink
                      href={next.path}
                      className="group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-singularity/30 transition-all flex flex-col items-end gap-4 text-right"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 flex items-center gap-2">
                        {isZh ? '下一頁' : 'Next'}
                        <ChevronRight size={12} />
                      </span>
                      <span className="text-lg font-black italic text-gray-400 group-hover:text-white transition-colors">
                        {next.title}
                      </span>
                    </StaticLink>
                  ) : (
                    <div />
                  )}
                </div>
              )
            })()}
          </motion.div>
        </main>

        {tocVisible && (
          <aside className="hidden xl:block xl:w-72 xl:shrink-0 relative">
            <div className="sticky top-28 h-[calc(100vh-10rem)] overflow-y-auto scrollbar-hide pr-4 -mr-4">
              {tocItems.length > 0 && (
                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group/toc">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-singularity via-transparent to-transparent opacity-20" />

                  <div className="mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-3">
                    <div className="w-8 h-[1px] bg-white/10" />
                    {isZh ? '本頁內容' : 'CONTENTS'}
                  </div>

                  <nav aria-label="Table of contents">
                    <ul className="space-y-1">
                      {tocItems.map((item) => {
                        const isActive = activeId === item.id
                        const indent = item.level === 3 ? 'pl-4' : item.level === 4 ? 'pl-8' : ''
                        return (
                          <li key={item.id} className={`${indent} relative group/toc-item`}>
                            <a
                              href={`#${item.id}`}
                              onClick={(e) => scrollToAnchor(e, item.id)}
                              className={`block py-2 text-[13px] transition-all duration-500 rounded-lg px-3 ${
                                isActive
                                  ? 'text-singularity font-black bg-singularity/5'
                                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {item.text}
                            </a>
                            {isActive && (
                              <motion.div
                                layoutId="toc-active"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-singularity rounded-full shadow-[0_0_15px_rgba(0,240,255,1)]"
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                              />
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </Layout>
  )
}
