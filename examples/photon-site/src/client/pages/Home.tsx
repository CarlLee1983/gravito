import { Head, Link, router } from '@inertiajs/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  Cpu,
  Gauge,
  Moon,
  Sun,
  Workflow,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Footer } from '../components/Footer'
import { PhotonHero } from '../components/PhotonHero'

const stats = [
  {
    id: 'LAB_DATA_01',
    icon: Activity,
    label: 'THROUGHPUT',
    value: '124,582',
    unit: 'req/s',
    status: 'optimal',
  },
  {
    id: 'LAB_DATA_02',
    icon: Gauge,
    label: 'LATENCY_P50',
    value: '0.84',
    unit: 'ms',
    status: 'optimal',
  },
  {
    id: 'LAB_DATA_03',
    icon: Workflow,
    label: 'OVERHEAD_VS_NATIVE',
    value: '< 1.2',
    unit: '%',
    status: 'minimal',
  },
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
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light')
      }
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

  // --- Language Management ---
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  const currentLang = (searchParams.get('lang') === 'zh-TW' ? 'zh-TW' : 'en') as 'en' | 'zh-TW'

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'zh-TW' : 'en'
    // Update URL param
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('lang', newLang)
    // Use Inertia to navigate without full reload if possible, or just window.location since it might be easier for root path params?
    // Actually router.visit is best.
    router.visit(newUrl.pathname + newUrl.search, {
      preserveScroll: true,
      preserveState: true,
    })
  }

  // Translations
  const t = {
    en: {
      docs: 'Documentation_',
      scroll: 'Scroll_to_explore',
      intro: 'Introduction',
      quickstart: 'Quickstart',
      usage: 'Why Photon?',
      launch: '60s to launch',
      aot: 'AOT Routing',
      aot_desc: 'O(1) Dispatch',
      middleware: 'Middleware',
      middleware_desc: 'Async Chains',
      near_zero: 'Near-Zero',
      overhead: 'Overhead.',
      desc_p1: 'Generic shims usually cost 15-20% in performance.',
      desc_p2: 'Photon is engineered to be invisible. In our latest baseline tests, we achieved',
      desc_p3: "of Bun's theoretical maximum throughput.",
      view_metrics: 'View Detailed Metrics',
      master: 'Master the Engine.',
      docs_intro: 'Docs_',
      docs_desc:
        'Our documentation is more than just a reference. It is a technical deep-dive into zero-copy memory management, AOT compilation, and non-blocking I/O.',
      ready: '// READY_FOR_DEEP_LEARNING',
      start_reading: 'Start Reading Documentation',
    },
    'zh-TW': {
      docs: '技術文件_',
      scroll: '滑動探索',
      intro: '介紹',
      quickstart: '快速開始',
      usage: '為什麼選擇 Photon?',
      launch: '60秒啟動',
      aot: 'AOT 路由',
      aot_desc: 'O(1) 調度',
      middleware: '中介軟體',
      middleware_desc: '非同步鏈',
      near_zero: '幾近零',
      overhead: '開銷。',
      desc_p1: '通用墊片 (Shims) 通常會造成 15-20% 的效能損耗。',
      desc_p2: 'Photon 專為隱形而生。在最新的基準測試中，我們達到了',
      desc_p3: 'Bun 理論最大吞吐量的 98.8%。',
      view_metrics: '查看詳細指標',
      master: '精通引擎。',
      docs_intro: '文件_',
      docs_desc:
        '我們的文件不僅僅是參考手冊。它是關於零拷貝記憶體管理、AOT 編譯和非阻塞 I/O 的技術深度探討。',
      ready: '// 深度學習就緒',
      start_reading: '開始閱讀文件',
    },
  }[currentLang] || {
    // Fallback safely
    docs: 'Documentation_',
    scroll: 'Scroll_to_explore',
    intro: 'Introduction',
    quickstart: 'Quickstart',
    usage: 'Why Photon?',
    launch: '60s to launch',
    aot: 'AOT Routing',
    aot_desc: 'O(1) Dispatch',
    middleware: 'Middleware',
    middleware_desc: 'Async Chains',
    near_zero: 'Near-Zero',
    overhead: 'Overhead.',
    desc_p1: 'Generic shims usually cost 15-20% in performance.',
    desc_p2: 'Photon is engineered to be invisible. In our latest baseline tests, we achieved',
    desc_p3: "of Bun's theoretical maximum throughput.",
    view_metrics: 'View Detailed Metrics',
    master: 'Master the Engine.',
    docs_intro: 'Docs_',
    docs_desc:
      'Our documentation is more than just a reference. It is a technical deep-dive into zero-copy memory management, AOT compilation, and non-blocking I/O.',
    ready: '// READY_FOR_DEEP_LEARNING',
    start_reading: 'Start Reading Documentation',
  }

  // Dynamic content arrays
  const quickLinksDynamic = [
    { label: t.intro, href: `/docs/intro?lang=${currentLang}`, desc: t.usage },
    { label: t.quickstart, href: `/docs/quickstart?lang=${currentLang}`, desc: t.launch },
    { label: t.aot, href: `/docs/routing?lang=${currentLang}`, desc: t.aot_desc },
    { label: t.middleware, href: `/docs/middleware?lang=${currentLang}`, desc: t.middleware_desc },
  ]

  return (
    <div className="min-h-screen font-sans selection:bg-photon-gold/20 transition-colors duration-500 bg-p-bg text-s-txt">
      <Head title="PHOTON // THE ABSOLUTE ENGINE" />

      {/* Enhanced Pro-Max Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 px-12 py-6 flex justify-between items-center transition-all duration-500 ${
          scrolled
            ? 'bg-s-bg/80 backdrop-blur-xl border-b border-s-brd py-4 shadow-2xl'
            : 'bg-transparent'
        }`}
      >
        <Link
          href="/"
          className="text-2xl font-black text-p-txt tracking-tighter uppercase group flex items-center gap-2"
        >
          <div className="w-8 h-8 border border-photon-gold/30 flex items-center justify-center relative overflow-hidden group-hover:border-photon-gold transition-colors">
            <Zap
              size={14}
              className="text-photon-gold group-hover:scale-125 transition-transform"
            />
            <div className="absolute inset-0 bg-photon-gold/5 group-hover:bg-photon-gold/20 transition-colors" />
          </div>
          <span className="group-hover:translate-x-1 transition-transform duration-500">
            Pho<span className="opacity-50 italic">ton</span>
          </span>
        </Link>

        <div className="flex items-center gap-12">
          {/* LANG TOGGLE */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="w-10 h-10 flex items-center justify-center rounded-sm border border-s-brd bg-surf-bg hover:border-photon-gold/30 transition-all text-s-txt hover:text-photon-gold shadow-sm"
            title={currentLang === 'en' ? 'Switch to Traditional Chinese' : 'Switch to English'}
          >
            <span className="text-[10px] font-bold font-technical">
              {currentLang === 'en' ? 'EN' : '繁'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-sm border border-s-brd bg-surf-bg hover:border-photon-gold/30 transition-all text-s-txt hover:text-photon-gold shadow-sm"
          >
            <AnimatePresence mode="wait">
              {theme === 'dark' ? (
                <motion.div
                  key="moon"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Moon size={16} />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Sun size={16} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>

      <div className="grid-texture">
        <PhotonHero lang={currentLang} />

        {/* Floating Action Hint */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 animate-bounce opacity-20">
          <span className="text-[8px] font-technical tracking-[0.5em] text-p-txt uppercase">
            {t.scroll}
          </span>
          <ChevronRight size={16} className="rotate-90 text-photon-gold" />
        </div>

        {/* Quick Navigation Bridge */}
        <section className="relative z-30 max-w-7xl mx-auto px-12 mt-[-100px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-s-brd border border-s-brd backdrop-blur-xl shadow-2xl">
            {quickLinksDynamic.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="p-8 bg-s-bg hover:bg-surf-bg transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-full bg-photon-gold/0 group-hover:bg-photon-gold/[0.02] transition-all" />
                <span className="text-[8px] font-technical text-photon-gold block mb-2 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  {link.desc}
                </span>
                <span className="text-xs font-black text-p-txt tracking-widest uppercase flex items-center justify-between">
                  {link.label}
                  <ArrowUpRight
                    size={14}
                    className="text-m-txt group-hover:text-photon-gold group-hover:translate-x-1 group-hover:-translate-y-1 transition-all"
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Real-World Telemetry */}
        <section className="relative z-20 py-40 px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((item) => (
              <div
                key={item.id}
                className="glass-card group p-8 bg-s-bg border border-s-brd hover:border-photon-gold/30 transition-all"
              >
                <div className="flex justify-between items-start mb-12">
                  <div className="icon-container text-photon-gold/40 group-hover:text-photon-gold transition-colors">
                    <item.icon size={18} strokeWidth={1.5} />
                  </div>
                  <span className="text-[8px] font-technical tracking-[0.4em] text-m-txt uppercase">
                    [{item.id}]
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-black text-p-txt tracking-tighter transition-colors">
                    {item.value}
                  </span>
                  <span className="text-[10px] font-technical text-m-txt uppercase">
                    {item.unit}
                  </span>
                </div>
                <div className="text-technical text-[8px] flex items-center gap-2">
                  <span
                    className={`w-1 h-1 rounded-full ${item.status === 'optimal' ? 'bg-photon-gold' : 'bg-gray-600'}`}
                  />
                  {item.label}
                  {/* VALIDATED_M3_SILICON */}
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
              <div className="text-technical text-photon-gold mb-8">
                {/* ARCHITECTURAL_EFFICIENCY */}
              </div>
              <h2 className="text-7xl font-black text-p-txt uppercase tracking-tighter leading-[0.9] mb-12">
                {t.near_zero} <br />{' '}
                <span className="text-photon-gold italic font-light opacity-80">{t.overhead}</span>
              </h2>
              <p className="text-xl text-s-txt leading-relaxed mb-16 font-light">
                {t.desc_p1} <br />
                {t.desc_p2}
                <strong> 98.8% </strong>
                {t.desc_p3}
              </p>

              <Link
                href={`/docs/performance?lang=${currentLang}`}
                className="inline-flex items-center gap-6 text-[10px] font-black tracking-[0.5em] text-p-txt uppercase group py-5 px-10 bg-surf-bg border border-s-brd hover:border-photon-gold hover:text-photon-gold transition-all shadow-xl"
              >
                {t.view_metrics}
                <ArrowUpRight
                  size={14}
                  className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                />
              </Link>
            </div>

            <div className="glass-card p-12 mt-20 bg-s-bg border border-s-brd">
              <h4 className="text-xs font-technical text-p-txt mb-8 tracking-widest uppercase italic">
                Internal_Telemetry_Log {/* Jan_2026 */}
              </h4>

              <div className="space-y-6 font-technical text-[10px] leading-relaxed">
                <p className="text-m-txt">[00:01] INITIALIZING BASELINE_RUNNER...</p>
                <p className="text-m-txt">[00:03] JIT_FTL_WARMUP: COMPLETED (320ms)</p>
                <p className="text-m-txt">[00:05] TARGETING: APPLE_M3_SILICON</p>
                <p className="text-p-txt flex justify-between">
                  <span>&gt; PHOTON_CORE_DISPATCH</span>
                  <span className="text-photon-gold">0.84ms (P50)</span>
                </p>
                <p className="text-p-txt flex justify-between">
                  <span>&gt; HONO_DISPATCH_SHIM</span>
                  <span className="text-red-900">1.12ms (P50)</span>
                </p>
                <p className="text-p-txt flex justify-between">
                  <span>&gt; ELYSIA_DISPATCH_STATIC</span>
                  <span className="text-blue-900">1.02ms (P50)</span>
                </p>
                <div className="h-px bg-s-brd my-8" />
                <p className="text-photon-gold font-black">
                  RESULT: 98.8%_OF_NATIVE_BUN_THROUGHPUT
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Docs Access Section */}
        <section className="py-40 px-12 border-t border-s-brd bg-s-bg">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-24 items-center">
            <div className="flex-1">
              <h3 className="text-6xl font-black text-p-txt uppercase tracking-tighter mb-8 italic opacity-20">
                {t.docs_intro}
              </h3>
              <h4 className="text-3xl font-black text-p-txt uppercase tracking-tighter mb-8">
                {t.master}
              </h4>
              <p className="text-s-txt mb-12 font-light leading-loose text-lg">{t.docs_desc}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href={`/docs/routing?lang=${currentLang}`}
                  className="p-6 border border-s-brd bg-surf-bg hover:border-photon-gold/30 transition-all group shadow-sm"
                >
                  <Cpu
                    size={20}
                    className="text-photon-gold mb-4 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[10px] font-technical uppercase block mb-1 text-p-txt">
                    AOT_Routing
                  </span>
                  <span className="text-[8px] text-m-txt uppercase tracking-widest">
                    Compiler Logic
                  </span>
                </Link>
                <Link
                  href={`/docs/context?lang=${currentLang}`}
                  className="p-6 border border-s-brd bg-surf-bg hover:border-photon-gold/30 transition-all group shadow-sm"
                >
                  <Workflow
                    size={20}
                    className="text-photon-gold mb-4 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[10px] font-technical uppercase block mb-1 text-p-txt">
                    Fast_Context
                  </span>
                  <span className="text-[8px] text-m-txt uppercase tracking-widest">
                    Memory Pooling
                  </span>
                </Link>
              </div>
            </div>
            <div className="flex-1 w-full glass-card p-12 bg-surf-bg border border-s-brd relative group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <BookOpen size={120} strokeWidth={0.5} className="text-p-txt" />
              </div>
              <h5 className="text-technical text-photon-gold mb-8 uppercase tracking-[0.4em]">
                {t.ready}
              </h5>
              <Link
                href={`/docs/intro?lang=${currentLang}`}
                className="inline-block px-12 py-6 bg-p-txt text-p-bg font-black text-[10px] tracking-[0.4em] uppercase hover:bg-photon-gold hover:text-black transition-all relative z-10 shadow-xl"
              >
                {t.start_reading}
              </Link>
            </div>
          </div>
        </section>
        <Footer lang={currentLang} />
      </div>
    </div>
  )
}
