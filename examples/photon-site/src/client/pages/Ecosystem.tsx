import { Head } from '@inertiajs/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Check,
  ChevronRight,
  Database,
  Download,
  Globe,
  HardDrive,
  Layers,
  Layout,
  Mail,
  MessageSquare,
  Network,
  Radio,
  Search,
  Shield,
  Snowflake,
  Workflow,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { DocsLayout } from '../components/DocsLayout'
import { ecosystemTranslations } from '../locales/ecosystem'
import { getTranslation } from '../locales/types'

interface Orbit {
  name: string
  package: string
  description: string
  icon: any
  type: 'OFFICIAL' | 'THIRD_PARTY'
  link?: string
  features: string[]
  metrics?: { label: string; value: string }
}

const getOrbits = (lang: 'en' | 'zh-TW', t: any): Orbit[] => {
  const isZh = lang === 'zh-TW'
  return [
    {
      name: 'Sentinel',
      package: '@gravito/sentinel',
      description: isZh
        ? '先進的身份驗證與授權核心。支援 JWT、OAuth2 和 RBAC。'
        : 'Advanced authentication and authorization kernel. JWT, OAuth2, and RBAC support.',
      icon: Shield,
      type: 'OFFICIAL',
      features: isZh
        ? ['JWE 支援', '會話防護', '角色管理']
        : ['JWE Support', 'Session Shield', 'Role Management'],
      metrics: { label: t.metrics.latency, value: '< 0.05ms' },
    },
    {
      name: 'Atlas',
      package: '@gravito/atlas',
      description: isZh
        ? 'Active Record ORM。支援 PostgreSQL、MySQL、SQLite、MongoDB 和 Redis。'
        : 'Active Record ORM. Supports PostgreSQL, MySQL, SQLite, MongoDB, and Redis.',
      icon: Database,
      type: 'OFFICIAL',
      features: isZh
        ? ['Eloquent 風格', '多資料庫支援', '遷移與 Seed']
        : ['Eloquent-style', 'Multi-DB Support', 'Migrations & Seeders'],
      metrics: { label: t.metrics.queries, value: '1.2M+' },
    },
    {
      name: 'Prism',
      package: '@gravito/prism',
      description: isZh
        ? '具有 Blade 風格語法和預編譯渲染的原生模板引擎。'
        : 'Native template engine with Blade-inspired syntax and pre-compiled rendering.',
      icon: Layout,
      type: 'OFFICIAL',
      features: isZh
        ? ['邏輯區塊', '佈局 Yields', '高速 JIT']
        : ['Logic Blocks', 'Layout Yields', 'High-Speed JIT'],
      metrics: { label: t.metrics.render, value: '0.01ms' },
    },
    {
      name: 'Ion',
      package: '@gravito/ion',
      description: isZh
        ? 'Inertia.js 的內部 SPA 橋樑。輕鬆構建現代單體應用。'
        : 'Internal SPA Bridge for Inertia.js. Build modern monoliths easily.',
      icon: Zap,
      type: 'OFFICIAL',
      features: isZh
        ? ['共享狀態', '握手協議', '資產版本控制']
        : ['Shared State', 'Handshake Protocol', 'Asset Versioning'],
      metrics: { label: t.metrics.ttfb, value: '8ms (Edge)' },
    },
    {
      name: 'Stasis',
      package: '@gravito/stasis',
      description: isZh
        ? '智慧型多級快取系統。支援記憶體、檔案和 Redis 驅動。'
        : 'Smart multi-level cache system. Supports memory, file, and Redis drivers.',
      icon: HardDrive,
      type: 'OFFICIAL',
      features: isZh
        ? ['多級快取', '標籤支援', '分散式鎖']
        : ['Multi-Level Cache', 'Tags', 'Distributed Locks'],
      metrics: { label: t.metrics.throughput, value: '2.4M/s' },
    },
    {
      name: 'Signal',
      package: '@gravito/signal',
      description: isZh
        ? '專業級郵件發送系統。支援 SMTP、AWS SES 和多種渲染器。'
        : 'Professional-grade mail delivery system. Supports SMTP, AWS SES, and multiple renderers.',
      icon: Mail,
      type: 'OFFICIAL',
      features: isZh
        ? ['多驅動支援', 'React/Vue 渲染', '開發模式 UI']
        : ['Multi-Driver', 'React/Vue Renderers', 'Dev UI'],
    },
    {
      name: 'Ripple',
      package: '@gravito/ripple',
      description: isZh
        ? '基於 WebSockets 的實時通訊模組。實現瞬時數據同步。'
        : 'WebSocket-based real-time communication module. Instant data synchronization.',
      icon: Radio,
      type: 'OFFICIAL',
      features: isZh
        ? ['即時廣播', '頻道管理', '事件驅動']
        : ['Real-time Broadcast', 'Channel Management', 'Event-Driven'],
    },
    {
      name: 'Freeze',
      package: '@gravito/freeze',
      description: isZh
        ? '靜態網站生成器。為您的應用提供極致的載入性能與 SEO。'
        : 'Static Site Generator. Ultimate loading speed and SEO for your applications.',
      icon: Snowflake,
      type: 'OFFICIAL',
      features: isZh
        ? ['預渲染', 'i18n 支援', '自動 Sitemap']
        : ['Pre-rendering', 'i18n Support', 'Auto Sitemap'],
    },
    {
      name: 'Beam',
      package: '@gravito/beam',
      description: isZh
        ? '輕量級客戶端通訊工具。為前端提供類型安全的 API 調用介面。'
        : 'Lightweight client communication tool. Type-safe API call interfaces for frontend.',
      icon: Network,
      type: 'OFFICIAL',
      features: isZh
        ? ['類型安全', 'RPC 風格', '自動生成']
        : ['Type-Safe', 'RPC-Style', 'Auto-Generated'],
    },
    {
      name: 'Stream',
      package: '@gravito/stream',
      description: isZh
        ? '高效能工作佇列。支援多驅動與內嵌或獨立 worker。'
        : 'High-performance job queues. Multi-driver support with embedded or standalone workers.',
      icon: Workflow,
      type: 'OFFICIAL',
      features: isZh
        ? ['多驅動支援', '重試機制', '優先級佇列']
        : ['Multi-Driver', 'Retry Logic', 'Priority Queues'],
    },
    {
      name: 'Luminosity',
      package: '@gravito/luminosity',
      description: isZh
        ? 'SEO 智慧引擎。自動管理 Meta 數據與搜尋引擎索引優化。'
        : 'SEO smart engine. Automatically manages meta data and search engine indexing optimizations.',
      icon: Search,
      type: 'OFFICIAL',
      features: isZh
        ? ['自動 Meta', 'Sitemap 生成', 'Open Graph']
        : ['Auto Meta', 'Sitemap Generation', 'Open Graph'],
    },
  ]
}

export default function Ecosystem({ lang = 'en' }: { lang?: 'en' | 'zh-TW' }) {
  const currentLang = (lang === 'zh-TW' ? 'zh-TW' : 'en') as 'en' | 'zh-TW'
  const t = getTranslation(ecosystemTranslations, currentLang)
  const orbits = getOrbits(currentLang, t)
  const [copiedPackage, setCopiedPackage] = useState<string | null>(null)

  const handleInstall = (packageName: string) => {
    const command = `bun add ${packageName}`
    navigator.clipboard.writeText(command).then(() => {
      setCopiedPackage(packageName)
      setTimeout(() => setCopiedPackage(null), 2000)
    })
  }

  return (
    <DocsLayout currentId="ecosystem">
      <Head title={`${t.head_title} | Photon Engine`} />

      <div className="mb-24 relative">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-photon-gold/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3 mb-8">
          <div className="px-3 py-1 bg-photon-gold/10 border border-photon-gold/20 rounded-full text-[10px] text-photon-gold font-technical tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(255,184,0,0.1)]">
            Registry_v1.2.0_LATEST
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] text-green-500 font-technical tracking-[0.1em] uppercase">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Nodes_Global_Sync
          </div>
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-p-txt uppercase tracking-tighter mb-10 leading-[0.9] drop-shadow-sm">
          {t.title}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-photon-gold to-orange-500">
            Orbits
          </span>
        </h1>
        <p className="text-xl text-s-txt font-light max-w-3xl leading-relaxed opacity-80 border-l-2 border-photon-gold/20 pl-8 ml-1">
          {t.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-32">
        {orbits.map((orbit, idx) => (
          <motion.div
            key={orbit.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05, duration: 0.5 }}
            className="group relative p-10 bg-s-bg border border-s-brd hover:border-photon-gold/40 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all duration-500 overflow-hidden"
          >
            {/* Ambient Background Gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-photon-gold/5 blur-[40px] group-hover:bg-photon-gold/10 transition-colors pointer-events-none" />

            {/* Status Indicator */}
            <div className="absolute top-10 right-10 flex items-center gap-2">
              <span className="text-[9px] font-technical text-m-txt opacity-40 uppercase tracking-widest">
                {t.orbitType[orbit.type]}
              </span>
              <div
                className={`w-1.5 h-1.5 rounded-full ${orbit.type === 'OFFICIAL' ? 'bg-photon-gold shadow-[0_0_10px_rgba(255,184,0,0.6)]' : 'bg-gray-500'}`}
              />
            </div>

            <div className="flex items-start gap-8 mb-10">
              <div className="w-16 h-16 border border-s-brd flex items-center justify-center bg-surf-bg group-hover:border-photon-gold/40 transition-all duration-300 relative">
                <div className="absolute inset-0 bg-photon-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <orbit.icon
                  size={28}
                  strokeWidth={1.5}
                  className="text-p-txt group-hover:text-photon-gold group-hover:scale-110 transition-all duration-300 relative z-10"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-p-txt uppercase tracking-tight mb-2 group-hover:text-photon-gold transition-colors">
                  {orbit.name}
                </h3>
                <div className="text-[10px] font-technical text-m-txt tracking-[0.2em] opacity-60">
                  {orbit.package}
                </div>
              </div>
            </div>

            <p className="text-s-txt text-[15px] leading-relaxed mb-10 h-16 overflow-hidden opacity-90">
              {orbit.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              <div className="space-y-3">
                <div className="text-[10px] font-technical text-m-txt border-b border-s-brd pb-1 mb-3 uppercase tracking-[0.2em]">
                  {lang === 'zh-TW' ? '特徵' : 'FEATURES'}
                </div>
                {orbit.features.map((feat) => (
                  <div
                    key={feat}
                    className="flex items-center gap-3 text-[10px] font-technical text-p-txt uppercase tracking-widest leading-none"
                  >
                    <div className="w-1 h-1 bg-photon-gold/60 rounded-full" />
                    {feat}
                  </div>
                ))}
              </div>
              {orbit.metrics && (
                <div className="flex flex-col justify-end">
                  <div className="p-4 bg-surf-bg border border-s-brd rounded-sm">
                    <div className="text-[8px] font-technical text-m-txt uppercase tracking-widest mb-1">
                      {orbit.metrics.label}
                    </div>
                    <div className="text-xl font-technical font-black text-photon-gold">
                      {orbit.metrics.value}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-8 border-t border-s-brd/40">
              <button
                type="button"
                onClick={() => handleInstall(orbit.package)}
                className="flex-1 flex items-center justify-center gap-3 py-3 bg-surf-bg border border-s-brd text-[10px] font-technical text-p-txt hover:bg-photon-gold hover:text-black hover:border-photon-gold transition-all uppercase tracking-[0.2em] relative overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  {copiedPackage === orbit.package ? (
                    <motion.div
                      key="copied"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Check size={14} /> {t.copied}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="install"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Download size={14} /> {t.install}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
              <button
                type="button"
                className="px-4 py-3 bg-surf-bg border border-s-brd text-p-txt hover:border-photon-gold/40 transition-all"
              >
                <Layers size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-photon-gold/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-10 blur-xl" />
        <div className="p-16 md:p-24 bg-s-bg border border-s-brd relative overflow-hidden group hover:border-photon-gold/30 transition-all duration-700">
          <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-0">
            <Globe size={240} className="text-p-txt" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-px bg-photon-gold" />
              <div className="text-[10px] font-technical text-photon-gold uppercase tracking-[0.4em]">
                Contributor_Access
              </div>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-p-txt uppercase tracking-tighter mb-8 leading-none">
              {t.buildTitle} <br />
              <span className="text-photon-gold">Orbit_Expansion</span>
            </h2>
            <p className="text-xl text-s-txt max-w-2xl mb-12 leading-relaxed font-light opacity-80">
              {t.buildDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <a
                href="https://github.com/gravito-framework/gravito"
                className="inline-flex items-center justify-center gap-4 px-10 py-5 bg-photon-gold text-[12px] font-technical text-black uppercase tracking-widest font-black hover:bg-white transition-all shadow-xl shadow-photon-gold/10"
              >
                {t.registryDocs} <ChevronRight size={16} />
              </a>
              <a
                href="https://github.com/gravito-framework/gravito/discussions"
                className="inline-flex items-center justify-center gap-4 px-10 py-5 bg-surf-bg border border-s-brd text-[12px] font-technical text-p-txt uppercase tracking-widest hover:border-p-txt transition-all"
              >
                <MessageSquare size={16} /> Discuss_Proposal
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
        {[
          { label: lang === 'zh-TW' ? '總下載量' : 'TOTAL_PULLS', value: '4.8M+', icon: Download },
          { label: lang === 'zh-TW' ? '活動節點' : 'ACTIVE_NODES', value: '124K', icon: Activity },
          { label: lang === 'zh-TW' ? '安全審核' : 'SECURITY_SCORE', value: '99.8', icon: Shield },
          { label: lang === 'zh-TW' ? '全球延遲' : 'GLOBAL_LATENCY', value: '12ms', icon: Globe },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-m-txt opacity-60">
              <stat.icon size={12} />
              <span className="text-[9px] font-technical uppercase tracking-widest">
                {stat.label}
              </span>
            </div>
            <div className="text-3xl font-black text-p-txt tracking-tighter">{stat.value}</div>
          </div>
        ))}
      </div>
    </DocsLayout>
  )
}
