import React, { useState, useEffect } from 'react'
import { Link } from '@inertiajs/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu, Zap, Activity, Book, Terminal,
  Share2, Search, List, Layers, Play, X, Command
} from 'lucide-react'
import { navGroups, navItems } from '../constants/navigation'
import { Footer } from './Footer'


export const DocsLayout = ({ children, currentId }: { children: React.ReactNode, currentId?: string }) => {
  const [searchOpen, setSearchOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  // Listen for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Calculate reading progress
  useEffect(() => {
    const updateProgress = () => {
      const scrollTotal = document.documentElement.scrollHeight - window.innerHeight
      if (scrollTotal > 0) {
        setProgress((window.scrollY / scrollTotal) * 100)
      }
    }
    window.addEventListener('scroll', updateProgress)
    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <div className="bg-obsidian min-h-screen text-gray-400 font-sans selection:bg-photon-gold/20 grid-texture flex">
      {/* Global CRT Filter Overlay */}
      <div className="crt-overlay" />

      {/* Sidebar Navigation */}
      <aside className="w-80 border-r border-white/5 bg-[#080809] flex flex-col sticky top-0 h-screen z-40">
        <div className="p-12 flex-1 overflow-y-auto custom-scrollbar">
          <Link href="/" className="text-2xl font-black text-white tracking-tighter uppercase mb-12 flex items-center gap-3 group">
            <div className="w-8 h-8 border border-photon-gold/30 flex items-center justify-center relative overflow-hidden group-hover:border-photon-gold transition-colors">
              <Zap size={14} className="text-photon-gold group-hover:scale-125 transition-transform" />
              <div className="absolute inset-0 bg-photon-gold/5 group-hover:bg-photon-gold/20 transition-colors" />
            </div>
            <span className="group-hover:translate-x-1 transition-transform duration-500">
              Pho<span className="text-zinc-500 italic">ton</span>
            </span>
          </Link>

          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-sm py-3 px-4 text-[10px] font-technical tracking-widest hover:border-photon-gold/30 transition-all mb-12 group text-left"
          >
            <div className="flex items-center gap-3">
              <Search size={14} className="text-zinc-600 group-hover:text-photon-gold" />
              <span className="opacity-30 group-hover:opacity-100 transition-opacity">COMMAND_PALETTE</span>
            </div>
            <kbd className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded text-[8px] text-zinc-500 font-mono">
              <Command size={8} /> K
            </kbd>
          </button>

          <nav className="space-y-10">
            {navGroups.map((group) => (
              <div key={group.category} className="space-y-4">
                <div className="text-[9px] font-technical text-zinc-700 tracking-[0.4em] uppercase px-4">
                  {group.category}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-4 px-4 py-2.5 rounded-sm group transition-all ${currentId === item.id ? 'bg-white/[0.04] border border-white/5' : 'hover:bg-white/[0.02]'
                        }`}
                    >
                      <div className="relative w-4 h-4 flex items-center justify-center">
                        <item.icon size={11} className={currentId === item.id ? 'text-photon-gold' : 'text-zinc-600 group-hover:text-zinc-400'} />
                      </div>
                      <span className={`text-[10px] font-bold tracking-[0.15em] uppercase transition-colors ${currentId === item.id ? 'text-zinc-50' : 'text-zinc-500 group-hover:text-zinc-300'
                        }`}>
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="p-10 border-t border-white/5 bg-[#050506]">
          <div className="flex items-center gap-4">
            <Activity size={14} className="text-photon-gold/40" />
            <div className="flex flex-col">
              <span className="text-[8px] font-technical text-zinc-700 uppercase">Engine_Status</span>
              <span className="text-[10px] text-zinc-400 font-bold font-technical tracking-widest leading-none uppercase">Optimized_V1</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto h-screen custom-scrollbar bg-[#0a0a0b]">
        {/* Subdued HUD */}
        <div className="fixed top-0 right-0 p-12 pointer-events-none opacity-10 z-50 flex flex-col items-end">
          <div className="text-[9px] font-technical text-zinc-600 tracking-[0.4em] uppercase">
            X-Photon-Trace: {currentId || 'INDEX'}
          </div>
        </div>

        <div className="max-w-5xl py-24 px-12 md:px-24 mx-auto pb-4">
          <div className="mb-12 flex items-center gap-2 text-[10px] font-technical text-zinc-700 tracking-widest uppercase">
            <Link href="/" className="hover:text-photon-gold">HOME</Link>
            <span>/</span>
            <span className="text-zinc-500">{currentId || 'DOCS'}</span>
          </div>
          {children}
        </div>
        <Footer />
      </main>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="command-palette"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="terminal-input"
            >
              <div className="flex items-center gap-4 mb-6 text-[10px] text-gray-600 tracking-[0.4em]">
                <Terminal size={12} /> SEARCH_EXECUTE_COMMAND
              </div>
              <div className="flex items-center gap-4">
                <span className="text-photon-gold font-black text-xl">{'>'}</span>
                <input
                  autoFocus
                  type="text"
                  placeholder="QUERY_THE_ENGINE..."
                  className="bg-transparent border-none outline-none text-white font-mono text-xl w-full placeholder:opacity-20"
                />
              </div>
              <div className="mt-8 grid grid-cols-1 gap-2">
                {navItems.map(item => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                  >
                    <span className="text-xs text-gray-400 font-bold tracking-widest uppercase">{item.label}</span>
                    <span className="text-[10px] font-technical text-gray-700">MOD_{item.id}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 184, 0, 0.2); }
      `}</style>
    </div>
  )
}
