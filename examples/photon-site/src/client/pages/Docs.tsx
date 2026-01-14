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

export default function Docs({ title, content, id, slug, meta }: DocsProps) {
  // FIXED RENDER LOGIC: Ensure all parts maintain the photon-prose class
  const renderedContent = useMemo(() => {
    const parts = content.split('[BENCHMARK_LAB]')
    if (parts.length === 1) {
      return (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional documentation rendering
        <div className="photon-prose" dangerouslySetInnerHTML={{ __html: content }} />
      )
    }

    return (
      <div className="space-y-0">
        {' '}
        {/* No space here, let prose handle rhythm */}
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

      <div className="min-h-screen bg-obsidian">
        {/* Module Header */}
        <header className="max-w-4xl mx-auto mb-32 px-4 pt-16 relative z-10">
          <div className="flex items-center gap-6 mb-12">
            <div className="px-4 py-1.5 bg-photon-gold text-black text-[10px] font-black tracking-[0.4em] uppercase">
              MODULE_{id}
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-16 leading-[0.95] animate-text-glitch">
            {title}
            <span className="text-photon-gold animate-pulse">_</span>
          </h1>

          <div className="flex flex-wrap gap-12 py-10 border-y border-white/5 bg-white/[0.01]">
            <div className="flex flex-col gap-2">
              <span className="text-[8px] font-technical text-gray-600 uppercase tracking-widest">
                Core_Category
              </span>
              <span className="text-xs text-white font-bold tracking-widest uppercase">
                {meta?.category || 'SYSTEM_CORE'}
              </span>
            </div>
            <div className="flex flex-col gap-2 pl-12 border-l border-white/10">
              <span className="text-[8px] font-technical text-gray-600 uppercase tracking-widest">
                Est_Complexity
              </span>
              <span className="text-xs text-photon-gold font-bold tracking-widest uppercase">
                {meta?.complexity || 'TECHNICAL'}
              </span>
            </div>
            <div className="flex flex-col gap-2 pl-12 border-l border-white/10">
              <span className="text-[8px] font-technical text-gray-600 uppercase tracking-widest">
                Protocol_Status
              </span>
              <span className="text-xs text-green-500 font-black tracking-widest flex items-center gap-2">
                <CheckCircle2 size={12} /> VERIFIED_SECURE
              </span>
            </div>
          </div>
        </header>

        {/* The Content Surface */}
        <div className="max-w-4xl mx-auto relative px-4 pb-40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderedContent}
          </motion.div>

          {/* Navigation Bridge */}
          <div className="mt-60">
            <div className="text-technical text-gray-700 mb-12 flex items-center gap-4 uppercase">
              <Terminal size={14} /> continue_technical_sequence
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
                  className="group relative block border border-white/5 bg-white/[0.01] p-12 hover:bg-white/[0.02] transition-all cursor-pointer overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]"
                >
                  <div className="scanline-overlay" />
                  <div className="absolute top-0 left-0 w-1 h-full bg-photon-gold scale-y-0 group-hover:scale-y-100 transition-transform origin-top z-20" />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
                    <div>
                      <span className="text-technical text-photon-gold mb-4 block tracking-[0.5em]">
                        UP_NEXT
                      </span>
                      <h4 className="text-4xl font-black text-white uppercase tracking-tighter group-hover:translate-x-2 transition-transform">
                        {nextItem.label.replace(/_/g, ' ')}
                      </h4>
                    </div>
                    <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center group-hover:border-photon-gold/50 group-hover:scale-110 transition-all bg-black/20">
                      <ChevronRight className="text-white group-hover:text-photon-gold" size={32} />
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
