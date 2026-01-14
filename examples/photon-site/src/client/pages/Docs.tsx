import { Head, Link } from '@inertiajs/react'
import { motion } from 'framer-motion'
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
  // We use a simplified regex approach but wrap text content ONLY
  return html.replace(/<code>([\s\S]*?)<\/code>/g, (match, rawCode) => {
    // Decode common HTML entities that might be in the raw string from the server
    let code = rawCode
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    let highlighted = code
      // 1. Strings
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="string">$1</span>')

      // 2. Comments
      .replace(/(\/\/.*)/g, '<span class="comment">$1</span>')

      // 3. Keywords
      .replace(/\b(const|let|var|if|else|return|async|await|export|import|from|class|extends|new|try|catch|finally|throw|as|type|interface|enum|public|private|protected|static|readonly|case|switch|break|continue|default)\b/g, '<span class="keyword">$1</span>')

      // 4. Numbers & Bools
      .replace(/\b(\d+|true|false|null|undefined)\b/g, '<span class="number">$1</span>')

      // 5. Functions
      .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="function">$1</span>')

      // 6. Properties
      .replace(/\b([a-z_$][a-zA-Z0-9_$]*)(?=\s*:)/g, '<span class="property">$1</span>');

    return `<code>${highlighted}</code>`;
  });
}

export default function Docs({ title, content, id, slug, meta }: DocsProps) {
  // FIXED RENDER LOGIC: Ensure all parts maintain the photon-prose class
  const renderedContent = useMemo(() => {
    const highlightedContent = highlightCode(content);
    const parts = highlightedContent.split('[BENCHMARK_LAB]')

    if (parts.length === 1) {
      return (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional documentation rendering
        <div className="photon-prose" dangerouslySetInnerHTML={{ __html: highlightedContent }} />
      )
    }

    return (
      <div className="space-y-0">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional documentation rendering */}
        <div className="photon-prose" dangerouslySetInnerHTML={{ __html: parts[0] }} />
        <div className="my-24">
          <BenchmarkLab />
        </div>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional documentation rendering */}
        <div className="photon-prose" dangerouslySetInnerHTML={{ __html: parts[1] }} />
      </div>
    )
  }, [content])

  return (
    <DocsLayout currentId={slug}>
      <Head title={`${title} // PHOTON_ENGINE_DOCS`} />

      <div className="min-h-screen bg-[#0a0a0b]">
        {/* Module Header */}
        <header className="max-w-4xl mx-auto mb-32 px-4 pt-16 relative z-10">
          <div className="flex items-center gap-6 mb-12">
            <div className="px-4 py-1.5 bg-photon-gold/10 border border-photon-gold/20 text-photon-gold text-[10px] font-black tracking-[0.4em] uppercase">
              MODULE_{id}
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-zinc-50 uppercase tracking-tighter mb-16 leading-[0.95] animate-text-glitch">
            {title}
            <span className="text-photon-gold">_</span>
          </h1>

          <div className="flex flex-wrap gap-12 py-10 border-y border-white/5 bg-white/[0.01]">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-technical text-zinc-600 uppercase tracking-widest">
                Core_Category
              </span>
              <span className="text-xs text-zinc-300 font-bold tracking-widest uppercase">
                {meta?.category || 'SYSTEM_CORE'}
              </span>
            </div>
            <div className="flex flex-col gap-2 pl-12 border-l border-white/10">
              <span className="text-[9px] font-technical text-zinc-600 uppercase tracking-widest">
                Est_Complexity
              </span>
              <span className="text-xs text-photon-gold/80 font-bold tracking-widest uppercase">
                {meta?.complexity || 'TECHNICAL'}
              </span>
            </div>
            <div className="flex flex-col gap-2 pl-12 border-l border-white/10">
              <span className="text-[9px] font-technical text-zinc-600 uppercase tracking-widest">
                Protocol_Status
              </span>
              <span className="text-xs text-emerald-500/80 font-black tracking-widest flex items-center gap-2">
                <CheckCircle2 size={12} /> VERIFIED_SECURE
              </span>
            </div>
          </div>
        </header>

        {/* The Content Surface */}
        <div className="max-w-4xl mx-auto relative px-4 pb-40">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderedContent}
          </motion.div>

          {/* Navigation Bridge */}
          <div className="mt-60">
            <div className="text-[10px] font-technical text-zinc-700 mb-10 flex items-center gap-4 uppercase tracking-[0.3em]">
              <Terminal size={14} className="text-zinc-800" /> CONTINUE_SEQUENCE
            </div>
            {(() => {
              const currentIndex = navItems.findIndex((item) => item.id === slug)
              const nextItem = navItems[currentIndex + 1]

              if (!nextItem) {
                return null
              }

              return (
                <Link
                  href={nextItem.href}
                  className="group relative block border border-white/5 bg-white/[0.02] p-12 hover:bg-white/[0.03] transition-all cursor-pointer overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-photon-gold/40 scale-y-0 group-hover:scale-y-100 transition-transform origin-top z-20" />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
                    <div>
                      <span className="text-[10px] font-technical text-photon-gold/60 mb-4 block tracking-[0.5em] uppercase">
                        UP_NEXT
                      </span>
                      <h4 className="text-4xl font-black text-zinc-50 uppercase tracking-tighter group-hover:translate-x-2 transition-transform">
                        {nextItem.label.replace(/_/g, ' ')}
                      </h4>
                    </div>
                    <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center group-hover:border-photon-gold/40 group-hover:scale-110 transition-all bg-black/20">
                      <ChevronRight className="text-zinc-400 group-hover:text-photon-gold" size={24} />
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
