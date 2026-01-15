import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { ChevronRight, Database, Download, Layers, Layout, Shield, Zap } from 'lucide-react'
import { DocsLayout } from '../components/DocsLayout'

interface Orbit {
  name: string
  package: string
  description: string
  icon: any
  type: 'OFFICIAL' | 'THIRD_PARTY'
  link?: string
  features: string[]
}

const translations = {
  en: {
    title: 'Ecosystem',
    subtitle:
      'Photon is an atomic core. Extend its capabilities using Orbits—plug-and-play modules designed for the Gravito framework.',
    typeLabel: 'Type',
    install: 'Install_Shell',
    buildTitle: 'Build Your Own',
    buildDesc:
      'Have a micro-service or utility that benefits the Gravito ecosystem? Join the registry and provide atomic power to thousands of nodes.',
    registryDocs: 'Registry Documentation',
    orbitType: { OFFICIAL: 'OFFICIAL', THIRD_PARTY: 'THIRD_PARTY' },
  },
  'zh-TW': {
    title: '生態系統',
    subtitle:
      'Photon 是一個原子核心。使用 Orbits 擴展其功能——專為 Gravito 框架設計的隨插即用模組。',
    typeLabel: '類型',
    install: '安裝 Shell',
    buildTitle: '構建您自己的',
    buildDesc:
      '擁有對 Gravito 生態系統有益的微服務或工具？加入註冊表，為成千上萬的節點提供原子動力。',
    registryDocs: '註冊表文檔',
    orbitType: { OFFICIAL: '官方', THIRD_PARTY: '第三方' },
  },
}

const getOrbits = (lang: 'en' | 'zh-TW'): Orbit[] => {
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
    },
    {
      name: 'Atlas',
      package: '@gravito/atlas',
      description: isZh
        ? 'Photon 的重量級 Data Mapper ORM。針對 PostgreSQL、MySQL、MariaDB 和 SQLite 的高速 SQL 編排。'
        : 'The heavyweight Data Mapper ORM for Photon. High-speed SQL orchestration for PostgreSQL, MySQL, MariaDB, and SQLite.',
      icon: Database,
      type: 'OFFICIAL',
      features: isZh
        ? ['AOT 查詢', '多資料庫支援', '實體映射']
        : ['AOT Queries', 'Multi-DB Support', 'Entity Mapping'],
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
    },
  ]
}

export default function Ecosystem({ lang = 'en' }: { lang?: 'en' | 'zh-TW' }) {
  const t = translations[lang] || translations.en
  const orbits = getOrbits(lang as 'en' | 'zh-TW')

  return (
    <DocsLayout currentId="ecosystem">
      <Head title={`${t.title} Orbits | Photon Engine`} />

      <div className="mb-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="px-2 py-0.5 bg-photon-gold/10 border border-photon-gold/20 rounded text-[10px] text-photon-gold font-technical tracking-[0.2em] uppercase">
            Registry_v1.1
          </div>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-p-txt uppercase tracking-tighter mb-8 leading-[0.95]">
          {t.title}
          <br />
          <span className="text-photon-gold">Orbits</span>
        </h1>
        <p className="text-xl text-s-txt font-light max-w-2xl leading-relaxed">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
        {orbits.map((orbit, idx) => (
          <motion.div
            key={orbit.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative p-8 bg-s-bg border border-s-brd hover:border-photon-gold/20 transition-all duration-500"
          >
            {/* Status Light */}
            <div
              className={`absolute top-8 right-8 w-1 h-1 rounded-full ${orbit.type === 'OFFICIAL' ? 'bg-photon-gold shadow-[0_0_8px_rgba(255,184,0,0.5)]' : 'bg-gray-400'}`}
            />

            <div className="flex items-center gap-6 mb-8">
              <div className="w-14 h-14 border border-s-brd flex items-center justify-center bg-surf-bg group-hover:border-photon-gold/30 transition-colors">
                <orbit.icon
                  size={24}
                  strokeWidth={1.5}
                  className="text-m-txt group-hover:text-photon-gold transition-colors"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-p-txt uppercase tracking-tight mb-1">
                  {orbit.name}
                </h3>
                <div className="text-[10px] font-technical text-m-txt tracking-wider">
                  {orbit.package}
                </div>
              </div>
            </div>

            <p className="text-s-txt text-sm leading-relaxed mb-8 h-12 overflow-hidden">
              {orbit.description}
            </p>

            <div className="space-y-3 mb-10">
              {orbit.features.map((feat) => (
                <div
                  key={feat}
                  className="flex items-center gap-3 text-[10px] font-technical text-m-txt uppercase tracking-widest"
                >
                  <div className="w-1 h-px bg-photon-gold/30" />
                  {feat}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-s-brd">
              <div className="text-[9px] font-technical text-m-txt tracking-[0.2em] uppercase">
                {t.typeLabel}: {t.orbitType[orbit.type]}
              </div>
              <button className="flex items-center gap-2 text-[10px] font-technical text-photon-gold/60 hover:text-photon-gold transition-colors uppercase tracking-[0.2em]">
                <Download size={12} /> {t.install}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-12 bg-s-bg border border-s-brd relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Layers size={80} className="text-p-txt" />
        </div>

        <h2 className="text-3xl font-black text-p-txt uppercase tracking-tighter mb-6 relative z-10">
          {t.buildTitle} <span className="text-photon-gold">Orbit</span>
        </h2>
        <p className="text-s-txt max-w-xl mb-8 relative z-10 leading-relaxed">{t.buildDesc}</p>
        <div className="flex flex-col sm:flex-row gap-6 relative z-10">
          <a
            // biome-ignore lint/a11y/useValidAnchor: placeholder
            href="#"
            className="inline-flex items-center gap-3 px-6 py-3 bg-surf-bg border border-s-brd text-[11px] font-technical text-p-txt uppercase tracking-widest hover:bg-photon-gold hover:text-black hover:border-photon-gold transition-all"
          >
            {t.registryDocs} <ChevronRight size={14} />
          </a>
        </div>
      </div>
    </DocsLayout>
  )
}
