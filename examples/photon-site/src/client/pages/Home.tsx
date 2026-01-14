import React, { useState, useEffect } from 'react'
import { Head, Link } from '@inertiajs/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight, Zap, Cpu, Activity, Gauge, Terminal,
  Layers, ShieldCheck, Microscope, Database, Workflow, BarChart3, BookOpen, ChevronRight,
  Sun, Moon
} from 'lucide-react'
import { PhotonHero } from '../components/PhotonHero'
import { Footer } from '../components/Footer'

const stats = [
  { id: 'LAB_DATA_01', icon: Activity, label: 'THROUGHPUT', value: '91,428', unit: 'req/s', status: 'optimal' },
  { id: 'LAB_DATA_02', icon: Gauge, label: 'LATENCY_P50', value: '0.97', unit: 'ms', status: 'optimal' },
  { id: 'LAB_DATA_03', icon: Workflow, label: 'OVERHEAD_VS_NATIVE', value: '< 1.8', unit: '%', status: 'minimal' },
]

const quickLinks = [
  { label: 'Introduction', href: '/docs/intro', desc: 'Why Photon?' },
  { label: 'Quickstart', href: '/docs/quickstart', desc: '60s to launch' },
  { label: 'AOT Routing', href: '/docs/routing', desc: 'O(1) Dispatch' },
  { label: 'Middleware', href: '/docs/middleware', desc: 'Async Chains' },
]

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)

    // Sync theme with localStorage
    const savedTheme = localStorage.getItem('photon-theme') as 'dark' | 'light'
    if (savedTheme) {
      setTheme(savedTheme)
      if (savedTheme === 'light') document.documentElement.classList.add('light')
    }

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    if (newTheme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    localStorage.setItem('photon-theme', newTheme)
  }

  return (
    <div className="min-h-screen font-sans selection:bg-photon-gold/20 transition-colors duration-500 bg-p-bg text-s-txt">
      <Head title="PHOTON // THE ABSOLUTE ENGINE" />

      {/* Enhanced Pro-Max Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 px-12 py-6 flex justify-between items-center transition-all duration-500 ${scrolled ? 'bg-s-bg/80 backdrop-blur-xl border-b border-s-brd py-4 shadow-2xl' : 'bg-transparent'
        }`}>
        <Link href="/" className="text-2xl font-black text-p-txt tracking-tighter uppercase group flex items-center gap-2">
          <div className="w-8 h-8 border border-photon-gold/30 flex items-center justify-center relative overflow-hidden group-hover:border-photon-gold transition-colors">
            <Zap size={14} className="text-photon-gold group-hover:scale-125 transition-transform" />
            <div className="absolute inset-0 bg-photon-gold/5 group-hover:bg-photon-gold/20 transition-colors" />
          </div>
          <span className="group-hover:translate-x-1 transition-transform duration-500">
            Pho<span className="opacity-50 italic">ton</span>
          </span>
        </Link>

        <div className="flex items-center gap-12">
          <Link href="/docs/intro" className="relative px-6 py-2 group">
            <span className="text-[10px] font-black tracking-[0.4em] text-p-txt uppercase relative z-10 transition-colors group-hover:text-photon-gold">
              Documentation_
            </span>
            <div className="absolute inset-0 border border-s-brd group-hover:border-photon-gold/50 transition-all transform -skew-x-12" />
            <div className="absolute inset-0 bg-photon-gold/0 group-hover:bg-photon-gold/5 transition-all transform -skew-x-12" />
            <div className="absolute -right-1 -top-1 w-2 h-2 bg-photon-gold rounded-full animate-ping opacity-40" />
          </Link>

          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-sm border border-s-brd bg-surf-bg hover:border-photon-gold/30 transition-all text-s-txt hover:text-photon-gold shadow-sm"
          >
            <AnimatePresence mode="wait">
              {theme === 'dark' ? (
                <motion.div key="moon" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <Moon size={16} />
                </motion.div>
              ) : (
                <motion.div key="sun" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <Sun size={16} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>

      <div className="grid-texture">
        <PhotonHero />

        {/* Floating Action Hint */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 animate-bounce opacity-20">
          <span className="text-[8px] font-technical tracking-[0.5em] text-p-txt uppercase">Scroll_to_explore</span>
          <ChevronRight size={16} className="rotate-90 text-photon-gold" />
        </div>

        {/* Quick Navigation Bridge */}
        <section className="relative z-30 max-w-7xl mx-auto px-12 mt-[-100px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-s-brd border border-s-brd backdrop-blur-xl shadow-2xl">
            {quickLinks.map((link) => (
              <Link key={link.label} href={link.href} className="p-8 bg-s-bg hover:bg-surf-bg transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-photon-gold/0 group-hover:bg-photon-gold/[0.02] transition-all" />
                <span className="text-[8px] font-technical text-photon-gold block mb-2 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  {link.desc}
                </span>
                <span className="text-xs font-black text-p-txt tracking-widest uppercase flex items-center justify-between">
                  {link.label}
                  <ArrowUpRight size={14} className="text-m-txt group-hover:text-photon-gold group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Real-World Telemetry */}
        <section className="relative z-20 py-40 px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((item) => (
              <div key={item.id} className="glass-card group p-8 bg-s-bg border border-s-brd hover:border-photon-gold/30 transition-all">
                <div className="flex justify-between items-start mb-12">
                  <div className="icon-container text-photon-gold/40 group-hover:text-photon-gold transition-colors">
                    <item.icon size={18} strokeWidth={1.5} />
                  </div>
                  <span className="text-[8px] font-technical tracking-[0.4em] text-m-txt uppercase">[{item.id}]</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-black text-p-txt tracking-tighter transition-colors">{item.value}</span>
                  <span className="text-[10px] font-technical text-m-txt uppercase">{item.unit}</span>
                </div>
                <div className="text-technical text-[8px] flex items-center gap-2">
                  <span className={`w-1 h-1 rounded-full ${item.status === 'optimal' ? 'bg-photon-gold' : 'bg-gray-600'}`} />
                  {item.label} // VALIDATED_M3_SILICON
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Engineering Comparison */}
        <section className="py-20 px-12 max-w-7xl mx-auto relative">
          <div className="absolute top-0 right-0 p-24 opacity-5 pointer-events-none text-p-txt">
            <BarChart3 size={600} strokeWidth={0.5} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-32 items-start text-left">
            <div>
              <div className="text-technical text-photon-gold mb-8">// ARCHITECTURAL_EFFICIENCY</div>
              <h2 className="text-7xl font-black text-p-txt uppercase tracking-tighter leading-[0.9] mb-12">
                Near-Zero <br /> <span className="text-photon-gold italic font-light opacity-80">Overhead.</span>
              </h2>
              <p className="text-xl text-s-txt leading-relaxed mb-16 font-light">
                Generic shims usually cost 15-20% in performance. <br />
                Photon is engineered to be invisible. In our latest baseline tests,
                we achieved <strong>98.2%</strong> of Bun&apos;s theoretical maximum throughput.
              </p>

              <Link href="/docs/performance" className="inline-flex items-center gap-6 text-[10px] font-black tracking-[0.5em] text-p-txt uppercase group py-5 px-10 bg-surf-bg border border-s-brd hover:border-photon-gold hover:text-photon-gold transition-all shadow-xl">
                View Detailed Metrics
                <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </div>

            <div className="glass-card p-12 mt-20 bg-s-bg border border-s-brd">
              <h4 className="text-xs font-technical text-p-txt mb-8 tracking-widest uppercase italic">Internal_Telemetry_Log // Jan_2026</h4>
              <div className="space-y-6 font-technical text-[10px] leading-relaxed">
                <p className="text-m-txt">[00:01] INITIALIZING BASELINE_RUNNER...</p>
                <p className="text-m-txt">[00:05] TARGETING: APPLE_M3_SILICON</p>
                <p className="text-p-txt flex justify-between">
                  <span>&gt; PHOTON_CORE_DISPATCH</span>
                  <span className="text-photon-gold">0.97ms (P50)</span>
                </p>
                <p className="text-p-txt flex justify-between">
                  <span>&gt; HONO_DISPATCH_SHIM</span>
                  <span className="text-red-900">1.14ms (P50)</span>
                </p>
                <p className="text-p-txt flex justify-between">
                  <span>&gt; ELYSIA_DISPATCH_STATIC</span>
                  <span className="text-blue-900">1.00ms (P50)</span>
                </p>
                <div className="h-px bg-s-brd my-8" />
                <p className="text-photon-gold font-black">RESULT: PHOTON_LEADS_LATENCY_TEST_SEQUENCE</p>
              </div>
            </div>
          </div>
        </section>

        {/* Docs Access Section */}
        <section className="py-40 px-12 border-t border-s-brd bg-s-bg">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-24 items-center">
            <div className="flex-1">
              <h3 className="text-6xl font-black text-p-txt uppercase tracking-tighter mb-8 italic opacity-20">Docs_</h3>
              <h4 className="text-3xl font-black text-p-txt uppercase tracking-tighter mb-8">Master the Engine.</h4>
              <p className="text-s-txt mb-12 font-light leading-loose text-lg">
                Our documentation is more than just a reference. It is a technical deep-dive
                into zero-copy memory management, AOT compilation, and non-blocking I/O.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/docs/routing" className="p-6 border border-s-brd bg-surf-bg hover:border-photon-gold/30 transition-all group shadow-sm">
                  <Cpu size={20} className="text-photon-gold mb-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-technical uppercase block mb-1 text-p-txt">AOT_Routing</span>
                  <span className="text-[8px] text-m-txt uppercase tracking-widest">Compiler Logic</span>
                </Link>
                <Link href="/docs/context" className="p-6 border border-s-brd bg-surf-bg hover:border-photon-gold/30 transition-all group shadow-sm">
                  <Workflow size={20} className="text-photon-gold mb-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-technical uppercase block mb-1 text-p-txt">Fast_Context</span>
                  <span className="text-[8px] text-m-txt uppercase tracking-widest">Memory Pooling</span>
                </Link>
              </div>
            </div>
            <div className="flex-1 w-full glass-card p-12 bg-surf-bg border border-s-brd relative group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <BookOpen size={120} strokeWidth={0.5} className="text-p-txt" />
              </div>
              <h5 className="text-technical text-photon-gold mb-8 uppercase tracking-[0.4em]">// READY_FOR_DEEP_LEARNING</h5>
              <Link href="/docs/intro" className="inline-block px-12 py-6 bg-p-txt text-p-bg font-black text-[10px] tracking-[0.4em] uppercase hover:bg-photon-gold hover:text-black transition-all relative z-10 shadow-xl">
                Enter Documentation
              </Link>
            </div>
          </div>
        </section>

        {/* Ignite Section */}
        <section className="py-60 text-center bg-p-txt text-p-bg relative overflow-hidden transition-colors duration-500">
          <div className="max-w-4xl mx-auto relative z-10">
            <motion.h2 initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} className="text-[10rem] font-black uppercase tracking-[-0.08em] leading-none mb-12">
              Ignite_
            </motion.h2>
            <div className="flex flex-col md:flex-row justify-center gap-8 px-12">
              <div className="flex-1 py-6 border-2 border-p-bg font-technical text-sm flex items-center justify-center gap-4 hover:bg-p-bg hover:text-p-txt transition-all cursor-pointer group">
                <Terminal size={16} className="group-hover:text-photon-gold transition-colors" />
                bun add @gravito/photon
              </div>
              <Link href="/docs/quickstart" className="flex-1 py-6 bg-p-bg text-p-txt font-black text-xs tracking-[0.4em] uppercase hover:bg-photon-gold hover:text-black transition-all flex items-center justify-center">
                Start Building
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
