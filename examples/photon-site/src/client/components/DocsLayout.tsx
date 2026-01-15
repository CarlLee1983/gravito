import React, { useState, useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight, Zap, Cpu, Activity, Gauge, Terminal,
  Layers, ShieldCheck, Microscope, Database, Workflow, BarChart3, BookOpen, ChevronRight,
  Sun, Moon, Search, Command, Languages
} from 'lucide-react'
import { navGroups, navItems } from '../constants/navigation'
import { Footer } from './Footer'

export const DocsLayout = ({ children, currentId }: { children: React.ReactNode, currentId?: string }) => {
  const [searchOpen, setSearchOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const { url } = usePage() // Get current URL to preserve path

  // --- Theme Management ---
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('photon-theme') as 'dark' | 'light') || 'dark'
    }
    return 'dark'
  })

  // --- Language Management ---
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const currentLang = searchParams.get('lang') === 'zh-TW' ? 'zh-TW' : 'en'

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'zh-TW' : 'en'
    router.visit(window.location.pathname, {
      data: { lang: newLang },
      preserveScroll: true,
      preserveState: true
    })
  }

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
    } else {
      root.classList.remove('light')
    }
    localStorage.setItem('photon-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  return (
    <div className="min-h-screen flex bg-p-bg text-s-txt transition-colors duration-500">
      {/* Global CRT Filter Overlay */}
      <div className="crt-overlay pointer-events-none" />

      {/* Sidebar Navigation */}
      <aside className="w-80 border-r border-s-brd flex flex-col sticky top-0 h-screen z-40 bg-s-bg transition-colors duration-500">
        <div className="p-12 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-12 gap-4">
            <Link href="/" className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3 group text-p-txt">
              <div className="w-8 h-8 border border-photon-gold/30 flex items-center justify-center relative overflow-hidden group-hover:border-photon-gold transition-colors">
                <Zap size={14} className="text-photon-gold group-hover:scale-125 transition-transform" />
                <div className="absolute inset-0 bg-photon-gold/5 group-hover:bg-photon-gold/20 transition-colors" />
              </div>
              <span className="hidden xl:inline group-hover:translate-x-1 transition-transform duration-500">
                Pho<span className="opacity-50 italic">ton</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {/* LANG TOGGLE */}
              <button
                onClick={toggleLanguage}
                className="w-8 h-8 flex items-center justify-center rounded-sm border border-s-brd bg-surf-bg text-s-txt hover:text-photon-gold transition-all shadow-sm group"
                title={currentLang === 'en' ? 'Switch to Traditional Chinese' : 'Switch to English'}
              >
                <span className="text-[10px] font-bold font-technical">
                  {currentLang === 'en' ? 'EN' : '繁'}
                </span>
              </button>

              {/* THEME TOGGLE */}
              <button
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-sm border border-s-brd bg-surf-bg text-s-txt hover:text-photon-gold transition-all shadow-sm"
              >
                <AnimatePresence mode="wait">
                  {theme === 'dark' ? (
                    <motion.div key="moon" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                      <Moon size={14} />
                    </motion.div>
                  ) : (
                    <motion.div key="sun" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                      <Sun size={14} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between border border-s-brd bg-surf-bg text-s-txt rounded-sm py-3 px-4 text-[10px] uppercase font-bold tracking-widest hover:border-photon-gold/30 transition-all mb-12 group text-left shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Search size={14} className="opacity-40 group-hover:text-photon-gold" />
              <span className="opacity-30 group-hover:opacity-100 transition-opacity">COMMAND_PALETTE</span>
            </div>
            <kbd className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded text-[8px] opacity-40">
              <Command size={8} /> K
            </kbd>
          </button>

          <nav className="space-y-10">
            {navGroups.map((group) => (
              <div key={group.category} className="space-y-4">
                <div className="text-[9px] font-bold text-m-txt tracking-[0.4em] uppercase px-4 opacity-70">
                  {group.category}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.id}
                      href={`${item.href}?lang=${currentLang}`}
                      className={`flex items-center gap-4 px-4 py-2.5 rounded-sm group transition-all ${currentId === item.id ? 'bg-surf-bg border border-s-brd text-p-txt shadow-sm' : 'text-s-txt hover:text-p-txt'}`}
                    >
                      <item.icon size={11} className={currentId === item.id ? 'text-photon-gold' : 'opacity-40 group-hover:opacity-100'} />
                      <span className="text-[10px] font-bold tracking-[0.15em] uppercase">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="p-10 border-t border-s-brd bg-surf-bg transition-colors duration-500">
          <div className="flex items-center gap-4">
            <Activity size={14} className="text-photon-gold/40" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-p-txt opacity-40 uppercase">Engine_Status</span>
              <span className="text-[10px] text-s-txt font-bold tracking-widest uppercase">Optimized_V2</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto h-screen custom-scrollbar transition-colors duration-500 grid-texture bg-p-bg">
        <div className="max-w-5xl py-24 px-12 md:px-24 mx-auto pb-4">
          <div className="mb-12 flex items-center gap-2 text-[10px] font-bold text-m-txt opacity-70 tracking-widest uppercase">
            <Link href="/" className="hover:text-photon-gold transition-colors text-p-txt">HOME</Link>
            <span>/</span>
            <span className="text-p-txt">{currentId || 'DOCS'}</span>
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
            className="fixed inset-0 z-[100] flex items-start justify-center pt-40 px-4 backdrop-blur-sm bg-black/60"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl p-8 border border-b-brd bg-surf-bg shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6 text-[10px] text-p-txt opacity-40 tracking-[0.4em]">
                <Terminal size={12} /> SEARCH_EXECUTE_COMMAND
              </div>
              <div className="flex items-center gap-4">
                <span className="text-photon-gold font-black text-xl">{'>'}</span>
                <input
                  autoFocus
                  type="text"
                  placeholder="QUERY_THE_ENGINE..."
                  className="bg-transparent border-none outline-none font-mono text-xl w-full text-p-txt placeholder:opacity-20"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,184,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-photon-gold); }
      `}</style>
    </div>
  )
}
