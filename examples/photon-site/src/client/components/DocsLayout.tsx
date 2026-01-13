import React from 'react'
import { Link } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { 
  FileText, Cpu, Zap, Activity, Book, ChevronRight, 
  Terminal, ShieldCheck, Share2, Search, Layers, Play
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: any
  href: string
}

const navItems: NavItem[] = [
  { id: '01', label: 'INTRODUCTION', icon: Book, href: '/docs/intro' },
  { id: '02', label: 'QUICKSTART', icon: Play, href: '/docs/quickstart' },
  { id: '03', label: 'ROUTING_SYSTEM', icon: Share2, href: '/docs/routing' },
  { id: '04', label: 'FAST_CONTEXT', icon: Activity, href: '/docs/context' },
  { id: '05', label: 'MIDDLEWARE', icon: Layers, href: '/docs/middleware' },
]

export const DocsLayout = ({ children, currentId }: { children: React.ReactNode, currentId?: string }) => {
  return (
    <div className="bg-obsidian min-h-screen text-gray-400 font-sans selection:bg-white/10 grid-texture flex">
      {/* Sidebar Navigation */}
      <aside className="w-80 border-r border-white/5 bg-[#010101] flex flex-col sticky top-0 h-screen">
        <div className="p-12 flex-1 overflow-y-auto custom-scrollbar">
          <Link href="/" className="text-2xl font-black text-white tracking-tighter uppercase mb-12 block group">
            Pho<span className="opacity-50 italic group-hover:opacity-100 transition-opacity">ton</span>
          </Link>
          
          <div className="relative mb-12 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-photon-gold transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="SEARCH_DOCS..."
              className="w-full bg-white/[0.02] border border-white/5 rounded-sm py-3 pl-12 pr-4 text-[10px] font-technical tracking-widest focus:border-photon-gold/30 focus:outline-none transition-all placeholder:opacity-30"
            />
          </div>

          <div className="text-[8px] font-technical text-gray-700 tracking-[0.4em] uppercase mb-6 opacity-50">
            // DOCUMENTATION_MAP
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link 
                key={item.id} 
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-sm group transition-all ${
                  currentId === item.id ? 'bg-white/[0.03] border border-white/5 shadow-[0_0_20px_rgba(255,184,0,0.05)]' : 'hover:bg-white/[0.01]'
                }`}
              >
                <span className={`text-[8px] font-technical ${currentId === item.id ? 'text-photon-gold font-bold' : 'text-gray-700'}`}>
                  {item.id}
                </span>
                <item.icon size={14} className={currentId === item.id ? 'text-photon-gold' : 'text-gray-600'} />
                <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${
                  currentId === item.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                }`}>
                  {item.label}
                </span>
                {currentId === item.id && (
                  <motion.div layoutId="nav-glow" className="ml-auto w-1 h-1 rounded-full bg-photon-gold shadow-[0_0_10px_#FFB800]" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-12 border-t border-white/5 bg-[#020202]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
              <Terminal size={12} className="text-gray-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-technical text-gray-500 uppercase">Current_Context</span>
              <span className="text-[10px] text-white font-bold font-technical tracking-widest leading-none">BUN_NATIVE_V1.1</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto h-screen custom-scrollbar">
        {/* Subtle HUD Overlay */}
        <div className="fixed top-0 right-0 p-12 pointer-events-none opacity-20 z-50">
          <div className="text-right">
            <div className="text-[10px] font-technical text-white uppercase tracking-tighter">Module_Index_{currentId || 'NA'}</div>
            <div className="text-[8px] font-technical text-gray-600 uppercase tracking-[0.3em] mt-2">Security_Protocol_Active</div>
          </div>
        </div>

        <div className="max-w-4xl p-24 mx-auto min-h-full flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          
          <footer className="mt-40 pt-12 border-t border-white/5 flex justify-between items-center text-[8px] font-technical text-gray-700 tracking-[0.5em] uppercase">
            <span>Photon // Engineering_Docs // 2026</span>
            <div className="flex gap-12">
              <a href="#" className="hover:text-white transition-colors">Lab</a>
              <a href="#" className="hover:text-white transition-colors">Specs</a>
            </div>
          </footer>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 184, 0, 0.2); }
      `}</style>
    </div>
  )
}