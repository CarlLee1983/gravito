import { Head, usePage } from '@inertiajs/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../components/Layout'
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

interface DocsProps {
  title: string
  content: string
  sidebar: SidebarItem[]
  currentPath: string
  toc: TocItem[]
  editUrl?: string
  locale?: string
}

export default function Docs() {
  const { trans } = useTrans()
  // Safe cast
  const props = usePage().props as unknown as DocsProps
  const { title, content, sidebar, currentPath, toc, editUrl, locale } = props
  const isZh = locale === 'zh'
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tocVisible, setTocVisible] = useState(true)

  const tocItems = useMemo(() => {
    return Array.isArray(toc) ? toc.filter((item) => item.level >= 2 && item.level <= 4) : []
  }, [toc])

  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    if (!content) return

    // Enhance code blocks with copy button
    const pres = Array.from(root.querySelectorAll('pre'))
    for (const pre of pres) {
      const existingWrapper = pre.closest('[data-pre-wrapper="true"]')
      if (existingWrapper) continue

      const wrapper = document.createElement('div')
      wrapper.dataset.preWrapper = 'true'
      wrapper.className = 'relative group'

      const parent = pre.parentNode
      if (!parent) continue

      parent.insertBefore(wrapper, pre)
      wrapper.appendChild(pre)

      pre.classList.add('pr-14')

      const button = document.createElement('button')
      button.type = 'button'
      button.className =
        'absolute top-3 right-3 rounded-md border border-gray-700/60 bg-gray-900/60 px-2.5 py-1.5 text-xs font-medium text-gray-200 opacity-0 backdrop-blur transition-opacity hover:bg-gray-900/80 focus:opacity-100 group-hover:opacity-100'
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

    // Wrap tables for horizontal scrolling on small screens
    const tables = Array.from(root.querySelectorAll('table'))
    for (const table of tables) {
      const parent = table.parentElement
      if (parent?.dataset.tableWrapper === 'true') continue

      const wrapper = document.createElement('div')
      wrapper.dataset.tableWrapper = 'true'
      wrapper.className = 'not-prose -mx-6 my-6 overflow-x-auto px-6'

      parent?.insertBefore(wrapper, table)
      wrapper.appendChild(table)

      table.classList.add('min-w-full')
    }
  }, [content])

  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    if (!content) return
    if (tocItems.length === 0) return

    const headingElements = tocItems
      .map((item) => root.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`))
      .filter(Boolean) as HTMLElement[]

    if (headingElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return

        visible.sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
        const id = (visible[0].target as HTMLElement).id
        setActiveId(id || null)
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: [0, 1] }
    )

    for (const el of headingElements) observer.observe(el)
    return () => observer.disconnect()
  }, [tocItems, content])

  return (
    <Layout>
      <Head title={`${title} - Gravito Docs`} />

      <div className="mx-auto w-full max-w-screen-2xl px-6 py-10 lg:flex lg:gap-8">
        <aside className="hidden lg:block lg:w-60 lg:shrink-0">
          <div className="sticky top-24 space-y-8">
            {sidebar.map((section, idx) => (
              <div key={idx}>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">{section.title}</h3>
                <ul className="space-y-2 border-l border-gray-100 dark:border-gray-800 pl-4">
                  {section.children?.map((item, cIdx) => {
                    const isActive = currentPath === item.path
                    return (
                      <li key={cIdx}>
                        <a
                          href={item.path}
                          className={`block text-sm transition-colors ${
                            isActive
                              ? 'text-blue-600 font-medium border-l-2 border-blue-600 -ml-[17px] pl-[15px]'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          {item.title}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/40 lg:p-8">
            <header className="mb-10">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {trans('nav.docs', 'Docs')}
                </p>
                {tocItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTocVisible((v) => !v)}
                    className="hidden xl:inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/50 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm backdrop-blur hover:bg-white/80 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-300 dark:hover:bg-gray-950/50 dark:hover:text-gray-100"
                    aria-expanded={tocVisible}
                  >
                    {tocVisible
                      ? isZh
                        ? '隱藏本頁目錄'
                        : 'Hide table of contents'
                      : isZh
                        ? '顯示本頁目錄'
                        : 'Show table of contents'}
                  </button>
                )}
              </div>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                {title}
              </h1>
            </header>

            {tocItems.length > 0 && (
              <details className="not-prose mb-10 rounded-xl border border-gray-200 bg-white/50 p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-950/30 xl:hidden">
                <summary className="cursor-pointer select-none font-semibold text-gray-900 dark:text-gray-100">
                  {isZh ? '本頁目錄' : 'On this page'}
                </summary>
                <nav aria-label="Table of contents" className="mt-3">
                  <ul className="space-y-2">
                    {tocItems.map((item) => {
                      const indent = item.level === 3 ? 'pl-3' : item.level === 4 ? 'pl-6' : ''
                      return (
                        <li key={item.id} className={indent}>
                          <a
                            href={`#${item.id}`}
                            className="block rounded-md px-2 py-1.5 leading-snug text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-900/50 dark:hover:text-gray-100"
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
                                prose prose-zinc prose-lg max-w-none dark:prose-invert
                                prose-headings:scroll-mt-24 prose-headings:tracking-tight
                                prose-a:font-medium prose-a:text-blue-600 hover:prose-a:text-blue-500 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300
                                prose-code:font-medium prose-code:text-cyan-700 prose-code:bg-cyan-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded dark:prose-code:text-cyan-300 dark:prose-code:bg-cyan-900/25
                                prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800 prose-pre:rounded-xl
                                prose-hr:border-gray-200 dark:prose-hr:border-gray-800
	                                prose-blockquote:border-blue-300 dark:prose-blockquote:border-blue-700
	                            "
              // biome-ignore lint/security/noDangerouslySetInnerHtml: docs markdown is treated as trusted content in this example site
              dangerouslySetInnerHTML={{ __html: content }}
            />

            <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-800">
              <a
                href={editUrl || 'https://github.com/CarlLee1983/gravito-core/tree/main/docs'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              >
                {locale === 'zh' ? '在 GitHub 編輯此頁' : 'Edit this page on GitHub'}{' '}
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
        </main>

        {tocVisible && (
          <aside className="hidden xl:block xl:w-56 xl:shrink-0">
            <div className="sticky top-24">
              {tocItems.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white/60 p-4 text-sm shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/40">
                  <div className="mb-3 text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                    {isZh ? '本頁目錄' : 'On this page'}
                  </div>
                  <nav aria-label="Table of contents">
                    <ul className="space-y-2">
                      {tocItems.map((item) => {
                        const isActive = activeId === item.id
                        const indent = item.level === 3 ? 'pl-3' : item.level === 4 ? 'pl-6' : ''
                        return (
                          <li key={item.id} className={indent}>
                            <a
                              href={`#${item.id}`}
                              className={`-mx-2 block rounded-md px-2 py-2 leading-snug transition-colors ${
                                isActive
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900/50 dark:hover:text-gray-200'
                              }`}
                            >
                              {item.text}
                            </a>
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
