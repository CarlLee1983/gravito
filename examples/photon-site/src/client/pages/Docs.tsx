import React from 'react'
import { Head } from '@inertiajs/react'
import { DocsLayout } from '../components/DocsLayout'
import { motion } from 'framer-motion'
import { 
  Bookmark, Clock, CheckCircle2, ChevronRight, Cpu, 
  Layers, Zap, Info, ArrowDown, Terminal
} from 'lucide-react'

interface DocsProps {
  title: string
  content: string
  id: string
  meta?: {
    lastUpdated: string
    complexity: string
    category: string
    readTime?: string
  }
}

export default function Docs({ title, content, id, meta }: DocsProps) {
  return (
    <DocsLayout currentId={id}>
      <Head title={`${title} // PHOTON_ENGINE_DOCS`} />
      
      <div className="min-h-screen bg-obsidian">
        {/* Module Header - Refined & Scaled Down */}
        <header className="max-w-4xl mx-auto mb-20 px-4 pt-16">
          <div className="flex items-center gap-4 mb-8 font-technical text-[9px] tracking-[0.4em] text-gray-600 uppercase">
            <span className="text-photon-gold opacity-100">MODULE_{id}</span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span>GRAVITO_PHOTON_PROTOCOL</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-8 leading-tight">
            {title}<span className="text-photon-gold opacity-50 ml-2">.</span>
          </h1>

          <div className="flex flex-wrap items-center gap-8 py-6 border-y border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-technical text-gray-700 uppercase">Category:</span>
              <span className="text-[10px] text-white font-bold tracking-widest uppercase">{meta?.category || 'CORE'}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-technical text-gray-700 uppercase">Status:</span>
              <span className="text-[10px] text-green-500 font-black tracking-widest uppercase flex items-center gap-2">
                <CheckCircle2 size={10} /> VERIFIED
              </span>
            </div>
            <div className="ml-auto text-[10px] font-technical text-gray-600">
              REV: {meta?.lastUpdated || '2026.01.13'}
            </div>
          </div>
        </header>

        {/* The Content Area */}
        <div className="max-w-4xl mx-auto px-4 pb-40 relative">
          <article 
            className="photon-prose relative z-10"
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        </div>

        {/* Footer Navigation */}
        <div className="max-w-4xl mx-auto px-4 mb-40">
          <div className="group relative border border-white/5 bg-white/[0.01] p-10 hover:bg-white/[0.02] transition-all cursor-pointer overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-photon-gold scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10 text-left">
              <div className="w-full">
                <span className="text-[8px] font-technical text-photon-gold mb-3 block tracking-[0.5em] uppercase">NEXT_SEQUENCE_0{parseInt(id) + 1}</span>
                <h4 className="text-2xl font-black text-white uppercase tracking-tighter group-hover:translate-x-2 transition-transform">Advanced Performance Optimization</h4>
              </div>
              <div className="w-14 h-14 rounded-full border border-white/10 flex-shrink-0 flex items-center justify-center group-hover:border-photon-gold/50 group-hover:scale-110 transition-all">
                <ChevronRight className="text-white group-hover:text-photon-gold" size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}
