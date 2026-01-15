import { Head, Link } from '@inertiajs/react'
import { CheckCircle2, ChevronRight, Terminal } from 'lucide-react'
import { useMemo } from 'react'
import { BenchmarkLab } from '../components/BenchmarkLab'
import { DocsLayout } from '../components/DocsLayout'
import { navItems } from '../constants/navigation'

interface DocsProps {
  title: string
  content: string
  id: string
  slug: string
  meta?: {
    lastUpdated: string
    complexity: string
    category: string
    readTime?: string
  }
}

// --- Cyber Syntax Highlighter Engine V2 (Safe DOM-less parsing) ---
function highlightCode(html: string) {
  if (!html) {
    return ''
  }
  return html.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, (_match, rawCode) => {
    const code = rawCode.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

    // Single-pass highlighting to prevent tag injection/overlap
    const tokens = [
      { name: 'string', regex: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/ },
      { name: 'comment', regex: /(\/\/.*)/ },
      {
        name: 'keyword',
        regex:
          /\b(const|let|var|if|else|return|async|await|export|import|from|class|extends|new|try|catch|finally|throw|as|type|interface|enum|public|private|protected|static|readonly|case|switch|break|continue|default)\b/,
      },
      { name: 'number', regex: /\b(\d+)\b/ },
      { name: 'boolean', regex: /\b(true|false|null|undefined)\b/ },
      { name: 'function', regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/ },
      { name: 'property', regex: /\b([a-z_$][a-zA-Z0-9_$]*)(?=\s*:)/ },
    ]

    const combinedRegex = new RegExp(tokens.map((t) => `(${t.regex.source})`).join('|'), 'g')

    const highlighted = code.replace(combinedRegex, (...args: any[]) => {
      // Find which group matched (args[1] to args[tokens.length])
      for (let i = 0; i < tokens.length; i++) {
        if (args[i + 1] !== undefined) {
          return `<span class="${tokens[i].name}">${args[i + 1]}</span>`
        }
      }
      return args[0]
    })

    return `
      <div class="terminal-window">
        <div class="terminal-header">
          <div class="terminal-dots">
            <span class="dot-red"></span>
            <span class="dot-amber"></span>
            <span class="dot-green"></span>
          </div>
          <div class="terminal-title">PHOTON_SESSION // EXE</div>
        </div>
        <pre><code>${highlighted}</code></pre>
      </div>
    `
  })
}

export default function Docs({
  title,
  content,
  id,
  slug,
  meta,
  lang = 'en',
}: DocsProps & { lang?: 'en' | 'zh-TW' }) {
  const renderedContent = useMemo(() => {
    const highlightedContent = highlightCode(content || '')
    const parts = highlightedContent.split('[BENCHMARK_LAB]')

    return (
      <div className="text-left">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted content */}
        <div className="photon-prose" dangerouslySetInnerHTML={{ __html: parts[0] }} />
        {parts.length > 1 && (
          <>
            <div className="my-24">
              <BenchmarkLab lang={lang} />
            </div>
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted content */}
            <div className="photon-prose" dangerouslySetInnerHTML={{ __html: parts[1] }} />
          </>
        )}
      </div>
    )
  }, [content, lang])

  return (
    <DocsLayout currentId={slug}>
      <Head title={`${title} // PHOTON_ENGINE_DOCS`} />

      <div className="min-h-screen">
        {/* Module Header */}
        <header className="max-w-4xl mx-auto mb-32 relative z-10">
          <div className="flex items-center gap-6 mb-12">
            <div className="px-4 py-1.5 border border-photon-gold/20 bg-photon-gold/10 text-photon-gold text-[10px] font-black tracking-[0.4em] uppercase">
              MODULE_{id}
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-s-brd to-transparent" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-p-txt uppercase tracking-tighter mb-16 leading-[0.95]">
            {title}
            <span className="text-photon-gold">_</span>
          </h1>

          <div className="flex flex-wrap gap-12 py-10 border-y border-s-brd bg-surf-bg">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-p-txt opacity-40 uppercase tracking-widest">
                Core_Category
              </span>
              <span className="text-xs font-bold text-s-txt tracking-widest uppercase">
                {meta?.category || 'SYSTEM_CORE'}
              </span>
            </div>
            <div className="flex flex-col gap-2 pl-12 border-l border-s-brd">
              <span className="text-[9px] font-bold text-p-txt opacity-40 uppercase tracking-widest">
                Est_Complexity
              </span>
              <span className="text-xs font-bold text-photon-gold tracking-widest uppercase">
                {meta?.complexity || 'TECHNICAL'}
              </span>
            </div>
            <div className="flex flex-col gap-2 pl-12 border-l border-s-brd">
              <span className="text-[9px] font-bold text-p-txt opacity-40 uppercase tracking-widest">
                Protocol_Status
              </span>
              <span className="text-xs text-emerald-500 font-black tracking-widest flex items-center gap-2">
                <CheckCircle2 size={12} /> VERIFIED_SECURE
              </span>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto relative pb-40">
          {renderedContent}

          {/* Navigation Bridge */}
          <div className="mt-60">
            <div className="text-[10px] font-bold text-m-txt mb-10 flex items-center gap-4 uppercase tracking-[0.3em]">
              <Terminal size={14} className="opacity-30" /> CONTINUE_SEQUENCE
            </div>
            {(() => {
              const currentIndex = navItems.findIndex((item) => item.id === slug)
              const nextItem = navItems[currentIndex + 1]
              if (!nextItem) {
                return null
              }

              // --- Language Persistence Logic ---
              // Ensure we carry over the ?lang=zh-TW param if it exists.
              const searchParams =
                typeof window !== 'undefined'
                  ? new URLSearchParams(window.location.search)
                  : new URLSearchParams()
              const currentLang = searchParams.get('lang') === 'zh-TW' ? 'zh-TW' : 'en'

              return (
                <Link
                  href={`${nextItem.href}?lang=${currentLang}`}
                  className="group relative block border border-s-brd p-12 transition-all bg-s-bg shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-photon-gold/40 scale-y-0 group-hover:scale-y-100 transition-transform origin-top z-20" />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
                    <div>
                      <span className="text-[10px] font-bold text-photon-gold mb-4 block tracking-[0.5em] uppercase">
                        UP_NEXT
                      </span>
                      <h4 className="text-4xl font-black text-p-txt uppercase tracking-tighter group-hover:translate-x-2 transition-transform">
                        {nextItem.label.replace(/_/g, ' ')}
                      </h4>
                    </div>
                    <div className="w-16 h-16 rounded-full border border-s-brd bg-surf-bg flex items-center justify-center group-hover:border-photon-gold/40 group-hover:scale-110 transition-all">
                      <ChevronRight
                        className="text-m-txt group-hover:text-photon-gold transition-colors"
                        size={24}
                      />
                    </div>
                  </div>
                </Link>
              )
            })()}
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}
