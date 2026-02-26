import { Head, usePage } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { BookOpen, ExternalLink, Globe, Package, Rocket, Sparkles, Star, Tag } from 'lucide-react'
import Layout from '../components/Layout'
import { ReleaseCanvas } from '../components/ReleaseCanvas'
import { isStaticSite, StaticLink } from '../components/StaticLink'

interface ReleaseEntry {
  id: string
  date: string
  type: 'release' | 'feature' | 'announcement' | 'milestone'
  version?: string
  title: string
  description: string
  highlights?: string[]
  links?: { label: string; url: string }[]
  featured?: boolean
}

// Release data - can be moved to a separate data file or CMS later
// Release data - can be moved to a separate data file or CMS later
const releasesZh: ReleaseEntry[] = [
  {
    id: 'core-v1-6-galaxy',
    date: '2026-02-26',
    type: 'release',
    version: '1.6.0',
    title: 'Gravito v1.6 "Galaxy" 正式版發佈',
    description:
      '重大架構演進！引進 Galaxy Architecture 與 Xenon 並行運行時，標誌著從單體核心向分佈式銀河架構的跨越。',
    highlights: [
      'Xenon 運行時：支援領域衛星 (Satellites) 的並行加載與執行',
      'Guardian 防護層：原生整合 @gravito/resilience，具備熔斷器與容錯機制',
      'Cartesian Mapper：Atlas ORM v2.0 支援原生分片與高效能模型映射',
      'MDD 驅動：全面採用清單驅動開發 (Manifest-Driven Development)',
    ],
    links: [
      { label: '查看銀河架構圖', url: '/zh/docs/guide/architecture/core-concepts' },
      { label: '閱讀 2026 審計報告', url: '/zh/docs/guide/advanced/rest-api' },
    ],
    featured: true,
  },
  {
    id: 'photon-site-launch',
    date: '2026-01-22',
    type: 'announcement',
    title: 'Photon 官網正式上線',
    description:
      'Gravito Photon 引擎的官方網站現已正式發布！深入了解專為 Bun 打造的極致效能 HTTP 引擎。',
    highlights: [
      '超高效能：展示基於 Hono 基礎優化的 Photon 引擎測試數據',
      '全新視覺：採用 Gravito 引力核心設計語言',
      '完整文檔：包含安裝、路由、中間件與 SSG 支援等詳細指南',
      '動態體驗：結合 Canvas 物理引擎的互動式網頁設計',
    ],
    links: [
      { label: '訪問 Photon 官網', url: 'https://photon.gravito.dev' },
      { label: '查看文檔', url: 'https://photon.gravito.dev/docs/intro' },
    ],
    featured: true,
  },
  {
    id: 'zenith-launch',
    date: '2026-01-13',
    type: 'release',
    version: '1.0.0',
    title: 'Zenith 1.0 正式上線 - 零配置控制面板',
    description:
      'Gravito 生態系統的最後一塊拼圖：Zenith 正式發佈！專為 Flux 與 Stream 打造的全方位觀測與管理介面。',
    highlights: [
      '即時觀測：即時監控隊列健康狀況與系統負載',
      '任務管理：視覺化操作任務重試、刪除與排程調整',
      '多環境支援：一套面板切換生產、預發與開發環境',
      '極致體驗：基於 Inertia.js 打造的流暢 SPA 管理介面',
    ],
    links: [
      { label: '訪問 Zenith 官網', url: 'https://zenith.gravito.dev' },
      { label: '查看原始碼', url: 'https://github.com/gravito-framework/gravito' },
    ],
    featured: true,
  },
  {
    id: 'atlas-v1-4',
    date: '2026-01-27',
    type: 'release',
    version: '1.4.0',
    title: 'Atlas ORM v1.4.0 正式發佈',
    description:
      'Atlas ORM 迎來重大性能優化更新！針對核心組件進行深度優化，顯著提升查詢構建、模型操作和批量處理的性能。',
    highlights: [
      '性能優化：QueryBuilder Clone 採用 Copy-on-Write 策略，只讀場景性能提升 30-50%',
      '深度比較優化：DirtyTracker 使用結構化比較算法，避免 JSON.stringify 開銷，性能提升 60-80%',
      '快取優化：Model Hydration 快取屬性描述符和 Studly case 轉換，屬性存取性能提升 15-25%',
      '批量操作優化：動態計算最優 Chunk Size，根據資料庫類型和欄位數量自動調整，批量插入性能提升 20-40%',
      '開發體驗：Grammar 快取新增詳細統計功能，提供 hit/miss rate 等監控指標',
    ],
    links: [
      { label: '訪問 Atlas 官網', url: 'https://atlas.gravito.dev' },
      { label: '查看文檔', url: 'https://atlas.gravito.dev/docs' },
    ],
    featured: true,
  },
  {
    id: 'atlas-v1-1',
    date: '2026-01-13',
    type: 'release',
    version: '1.1.0',
    title: 'Atlas ORM v1.1.0 正式發佈',
    description:
      'Atlas ORM 迎來重大更新！大幅提升了效能並優化了開發者體驗，同時導入了全新的「數據流」視覺呈現。',
    highlights: [
      '輕量化：驅動程式改為選配，大幅縮小安裝體積',
      '高效能：導入 Canvas 渲染技術優化「數據流」背景動畫',
      '穩定性：修正多項查詢邊界情況與類型推導問題',
      '混合視覺：結合高品質靜態背景與動態 Canvas 疊加',
    ],
    links: [
      { label: '訪問 Atlas 官網', url: 'https://atlas.gravito.dev' },
      { label: '查看文檔', url: 'https://atlas.gravito.dev/docs' },
    ],
    featured: false,
  },
  {
    id: 'atlas-site-launch',
    date: '2026-01-13',
    type: 'announcement',
    title: 'Atlas 官網正式上線',
    description:
      'Gravito Atlas ORM 的官方文檔與展示網站現已上線！深入探索專為 Bun 打造的高性能 Cartesian Mapper，體驗極致的數據庫操作效率。',
    highlights: [
      '互動式架構圖表',
      '效能評測 (vs TypeORM/Prisma)',
      '完整的 API 參考手冊',
      '從 Laravel/TypeORM 遷移指南',
    ],
    links: [
      { label: '訪問 Atlas 官網', url: 'https://atlas.gravito.dev' },
      { label: '閱讀文檔', url: 'https://atlas.gravito.dev/docs' },
    ],
    featured: true,
  },
  {
    id: 'lux-launch',
    date: '2025-12-25',
    type: 'announcement',
    title: 'Lux 官網正式上線',
    description:
      'Gravito Lux 主題官網 lux.gravito.dev 正式發布！展示了 Gravito 框架的核心理念與全新視覺設計語言。',
    highlights: ['全新「引力核心」視覺主題', '完整的中英文雙語文檔', 'SSG 靜態網站生成支援'],
    links: [
      { label: '訪問官網', url: 'https://lux.gravito.dev' },
      { label: '查看文檔', url: '/zh/docs' },
    ],
    featured: true,
  },
  {
    id: 'v1-rc-1',
    date: '2025-12-25',
    type: 'release',
    version: '1.0.0',
    title: 'Gravito v1.0.0 正式版發佈',
    description:
      '重大里程碑！Gravito 1.0 正式版正式發佈。包含 @gravito/core、@gravito/atlas、@gravito/sentinel 等核心套件的穩定版本。',
    highlights: [
      '@gravito/core: 核心框架穩定',
      '@gravito/atlas: ORM 功能完善',
      '@gravito/sentinel: 認證授權系統',
      '@gravito/fortify: 安全防護增強',
    ],
    links: [
      { label: 'NPM', url: 'https://www.npmjs.com/org/gravito' },
      { label: 'GitHub', url: 'https://github.com/gravito-framework/gravito' },
    ],
    featured: true,
  },
  {
    id: 'atlas-orm',
    date: '2025-12-20',
    type: 'milestone',
    title: 'Atlas ORM 達成 Laravel Eloquent 90% 相容',
    description:
      '經過數月開發，Atlas ORM 已實現 Laravel Eloquent 90% 以上的 API 相容性，包含關聯、集合、序列化、工廠等功能。',
    highlights: [
      '完整關聯支援 (HasOne, HasMany, BelongsTo, etc.)',
      'Collection 集合操作',
      'Model Factories & Seeders',
      'JSON 序列化與 API Resources',
    ],
  },
]

const releasesEn: ReleaseEntry[] = [
  {
    id: 'core-v1-6-galaxy',
    date: '2026-02-26',
    type: 'release',
    version: '1.6.0',
    title: 'Gravito v1.6 "Galaxy" Officially Released',
    description:
      'Major architectural evolution! Introducing Galaxy Architecture and Xenon Parallel Runtime, marking the leap from monolithic core to distributed galaxy systems.',
    highlights: [
      'Xenon Runtime: Parallel satellite loading and shared-memory execution',
      'Guardian Layer: Native @gravito/resilience with built-in circuit breakers',
      'Cartesian Mapper: Atlas ORM v2.0 with native sharding and extreme hydration',
      'MDD Driven: Transition to full Manifest-Driven Development',
    ],
    links: [
      { label: 'Galaxy Map', url: '/en/docs/guide/architecture/core-concepts' },
      { label: '2026 Audit Report', url: '/en/docs/guide/advanced/rest-api' },
    ],
    featured: true,
  },
  {
    id: 'photon-site-launch',
    date: '2026-01-22',
    type: 'announcement',
    title: 'Photon Official Site Launched',
    description:
      'The official documentation and showcase site for Gravito Photon engine is now live! Explore the high-performance HTTP engine built for Bun.',
    highlights: [
      'Ultra Performance: View benchmarks of the optimized Photon engine',
      'Modern Visuals: Powered by the Gravito "Gravity Core" design language',
      'Full Documentation: Detailed guides for routing, middleware, and SSG',
      'Interactive DX: Dynamic web design with Canvas physics integration',
    ],
    links: [
      { label: 'Visit Photon Site', url: 'https://photon.gravito.dev' },
      { label: 'Read Docs', url: 'https://photon.gravito.dev/docs/intro' },
    ],
    featured: true,
  },
  {
    id: 'zenith-launch',
    date: '2026-01-13',
    type: 'release',
    version: '1.0.0',
    title: 'Zenith 1.0 Launched - Zero-Config Control Plane',
    description:
      'The final piece of the Gravito ecosystem is here! Zenith provides ultimate observability and management for Flux & Stream.',
    highlights: [
      'Real-time Monitoring: Track queue health and system load instantly',
      'Task Management: Visual retry, delete, and schedule adjustments',
      'Multi-environment: Seamlessly switch between Production and Dev',
      'Premium DX: Fluid SPA admin interface powered by Inertia.js',
    ],
    links: [
      { label: 'Visit Zenith Site', url: 'https://zenith.gravito.dev' },
      { label: 'Source Code', url: 'https://github.com/gravito-framework/gravito' },
    ],
    featured: true,
  },
  {
    id: 'atlas-v1-4',
    date: '2026-01-27',
    type: 'release',
    version: '1.4.0',
    title: 'Atlas ORM v1.4.0 Released',
    description:
      'Major performance optimization release for Atlas ORM! Deep optimizations across core components significantly improve query building, model operations, and batch processing performance.',
    highlights: [
      'Performance: QueryBuilder Clone uses Copy-on-Write strategy, 30-50% faster for read-only scenarios',
      'Deep Comparison: DirtyTracker uses structured comparison algorithm, avoiding JSON.stringify overhead, 60-80% faster',
      'Caching: Model Hydration caches property descriptors and Studly case conversions, 15-25% faster property access',
      'Batch Operations: Dynamic optimal Chunk Size calculation based on database type and column count, 20-40% faster bulk inserts',
      'Developer Experience: Grammar cache now includes detailed statistics with hit/miss rate monitoring',
    ],
    links: [
      { label: 'Visit Atlas Site', url: 'https://atlas.gravito.dev' },
      { label: 'View Docs', url: 'https://atlas.gravito.dev/docs' },
    ],
    featured: true,
  },
  {
    id: 'atlas-v1-1',
    date: '2026-01-13',
    type: 'release',
    version: '1.1.0',
    title: 'Atlas ORM v1.1.0 Released',
    description:
      'Major milestone for Atlas ORM! Massive performance gains, improved DX, and a brand-new high-performance "Data Flow" visualization.',
    highlights: [
      'Lightweight: Drivers are now optional peer dependencies',
      'Performance: Canvas-based rendering for Hero visuals',
      'Stability: Fixed edge cases in Query Builder & Type inference',
      'Hybrid Visuals: Combined static hero background with dynamic data flow overlay',
    ],
    links: [
      { label: 'Visit Atlas Site', url: 'https://atlas.gravito.dev' },
      { label: 'View Docs', url: 'https://atlas.gravito.dev/docs' },
    ],
    featured: false,
  },
  {
    id: 'atlas-site-launch',
    date: '2026-01-13',
    type: 'announcement',
    title: 'Atlas Site Officially Launched',
    description:
      'The official documentation and showcase site for Orbit Atlas ORM is now live! Dive into the high-performance Cartesian Mapper built for Bun.',
    highlights: [
      'Interactive Architecture Diagrams',
      'Benchmarks (vs TypeORM/Prisma)',
      'Comprehensive API Reference',
      'Migration Guides',
    ],
    links: [
      { label: 'Visit Atlas Site', url: 'https://atlas.gravito.dev' },
      { label: 'Read Docs', url: 'https://atlas.gravito.dev/docs' },
    ],
    featured: true,
  },
  {
    id: 'lux-launch',
    date: '2025-12-25',
    type: 'announcement',
    title: 'Lux Site Officially Launched',
    description:
      'The Gravito Lux site (lux.gravito.dev) is live, showcasing Gravito’s core vision and the new visual language.',
    highlights: [
      'New “Gravity Core” visual theme',
      'Complete bilingual documentation',
      'SSG-ready static site support',
    ],
    links: [
      { label: 'Visit Website', url: 'https://lux.gravito.dev' },
      { label: 'View Docs', url: '/docs' },
    ],
    featured: true,
  },
  {
    id: 'v1-rc-1',
    date: '2025-12-25',
    type: 'release',
    version: '1.0.0',
    title: 'Gravito v1.0.0 Officially Released',
    description:
      'A major milestone! Gravito 1.0 is now officially released, featuring stable versions of @gravito/core, @gravito/atlas, @gravito/sentinel, and more.',
    highlights: [
      '@gravito/core: core stability milestone',
      '@gravito/atlas: ORM feature complete',
      '@gravito/sentinel: authentication and authorization',
      '@gravito/fortify: hardened security layer',
    ],
    links: [
      { label: 'NPM', url: 'https://www.npmjs.com/org/gravito' },
      { label: 'GitHub', url: 'https://github.com/gravito-framework/gravito' },
    ],
    featured: true,
  },
  {
    id: 'atlas-orm',
    date: '2025-12-20',
    type: 'milestone',
    title: 'Atlas ORM Reaches 90% Laravel Eloquent Compatibility',
    description:
      'After months of development, Atlas ORM now covers 90%+ of Eloquent APIs, including relations, collections, serialization, and factories.',
    highlights: [
      'Comprehensive relations (HasOne, HasMany, BelongsTo, etc.)',
      'Collection operations',
      'Model factories & seeders',
      'JSON serialization and API resources',
    ],
  },
]

const typeConfig = {
  release: {
    icon: Package,
    color: 'text-singularity',
    bg: 'bg-singularity/10',
    border: 'border-singularity/30',
    label: '發布',
  },
  feature: {
    icon: Sparkles,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    label: '功能',
  },
  announcement: {
    icon: Globe,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    label: 'Announcement',
  },
  milestone: {
    icon: Star,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    label: 'Milestone',
  },
}

const typeConfigZh = {
  release: {
    icon: Package,
    color: 'text-singularity',
    bg: 'bg-singularity/10',
    border: 'border-singularity/30',
    label: 'Release',
  },
  feature: {
    icon: Sparkles,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    label: 'Feature',
  },
  announcement: {
    icon: Globe,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    label: '公告',
  },
  milestone: {
    icon: Star,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    label: '里程碑',
  },
} satisfies typeof typeConfig

function ReleaseCard({
  entry,
  index,
  configMap,
  isZh,
}: {
  entry: ReleaseEntry
  index: number
  configMap: typeof typeConfig
  isZh: boolean
}) {
  const config = configMap[entry.type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="relative group"
    >
      {/* Timeline dot with Brand Pulse */}
      <div
        className={`
                    absolute top-8 w-5 h-5 rounded-full border-2 z-20 transition-all duration-700
                    ${
                      index % 2 === 0
                        ? 'md:-right-[50px] -left-[51px] md:left-auto'
                        : 'md:-left-[50px] -left-[51px]'
                    }
                    ${entry.featured ? 'border-singularity bg-singularity/20 scale-125' : 'border-white/20 bg-void'}
                `}
      >
        {entry.featured && (
          <div className="absolute inset-0 rounded-full bg-singularity animate-ping opacity-40" />
        )}
        <div
          className={`absolute inset-1.5 rounded-full ${entry.featured ? 'bg-singularity' : 'bg-white/40'}`}
        />
      </div>

      {/* Card Content with Brand Accents */}
      <div
        className={`
                    relative rounded-[2rem] border backdrop-blur-2xl p-8 overflow-hidden transition-all duration-500
                    ${
                      entry.featured
                        ? 'bg-gradient-to-br from-[#0F1218]/90 to-void/95 border-singularity/30 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8),0_0_20px_rgba(0,240,255,0.1)]'
                        : 'bg-white/5 border-white/10 hover:border-singularity/30 hover:bg-white/8 shadow-2xl'
                    }
                `}
      >
        {/* Brand Side Accent Line */}
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-singularity via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        {/* Shine effect for featured */}
        {entry.featured && (
          <motion.div
            initial={{ left: '-100%' }}
            animate={{ left: '200%' }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-singularity/5 to-transparent skew-x-[-25deg] pointer-events-none"
          />
        )}

        {/* Header Area */}
        <div className="flex flex-wrap items-center gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <span
              className={`
                                inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase border transition-all duration-500
                                ${
                                  entry.featured
                                    ? 'bg-singularity text-black border-transparent shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                                    : `${config.bg} ${config.color} ${config.border} group-hover:border-singularity/50`
                                }
                            `}
            >
              <Icon size={14} />
              {config.label}
            </span>

            {entry.version && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-black bg-white/5 text-white/60 border border-white/5 group-hover:border-white/20 transition-colors">
                <Tag size={13} />v{entry.version}
              </span>
            )}
          </div>

          <div className="ml-auto text-[10px] font-black tracking-widest text-gray-500 uppercase bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            {new Date(entry.date).toLocaleDateString(isZh ? 'zh-TW' : 'en-US', {
              year: 'numeric',
              month: 'short',
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="relative z-10">
          <h3
            className={`
                            font-black tracking-tighter mb-4 transition-all duration-500
                            ${
                              entry.featured
                                ? 'text-3xl md:text-4xl text-white group-hover:text-singularity'
                                : 'text-2xl text-white group-hover:text-singularity'
                            }
                        `}
          >
            {entry.title}
          </h3>

          <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-2xl font-medium">
            {entry.description}
          </p>

          {/* Highlights Grid with Brand Icons */}
          {entry.highlights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
              {entry.highlights.map((highlight, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group/item hover:border-singularity/40 hover:bg-singularity/[0.03] transition-all duration-300"
                >
                  <div className="p-2.5 rounded-xl bg-singularity/10 text-singularity group-hover/item:bg-singularity group-hover/item:text-black shadow-[0_0_10px_rgba(0,240,255,0.1)] transition-all">
                    <Rocket size={14} />
                  </div>
                  <span className="text-sm font-bold text-gray-300 group-hover/item:text-white transition-colors">
                    {highlight}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Action Links with Premium Buttons */}
          {entry.links && entry.links.length > 0 && (
            <div className="flex flex-wrap gap-4 pt-8 border-t border-white/5">
              {entry.links.map((link, i) => {
                const isExternal = link.url.startsWith('http')
                const LinkComponent = isStaticSite() || isExternal ? 'a' : StaticLink

                return (
                  <LinkComponent
                    key={i}
                    href={link.url}
                    {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={`
                                            inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs tracking-widest uppercase transition-all duration-300 relative overflow-hidden group/btn
                                            ${
                                              entry.featured
                                                ? 'bg-white text-black hover:bg-singularity hover:shadow-[0_0_30px_rgba(0,240,255,0.4)]'
                                                : 'bg-white/5 text-white/50 border border-white/5 hover:border-singularity hover:text-white'
                                            }
                                        `}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {isExternal ? <ExternalLink size={14} /> : <BookOpen size={14} />}
                      {link.label}
                    </span>
                  </LinkComponent>
                )
              })}
            </div>
          )}
        </div>

        {/* Decorative Bottom Glow */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-singularity/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-singularity/20 transition-all duration-700" />
      </div>
    </motion.div>
  )
}

export default function Releases() {
  const { props } = usePage<{ locale?: string }>()
  const isZh = props.locale === 'zh'
  const entries = isZh ? releasesZh : releasesEn
  const configMap = isZh ? typeConfigZh : typeConfig

  return (
    <Layout>
      <Head title={isZh ? '更新日誌 | Gravito' : 'Releases | Gravito'} />

      {/* Dynamic Canvas Atmosphere */}
      <ReleaseCanvas />

      {/* Brand Atmosphere Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] right-[-5%] w-[600px] h-[600px] bg-singularity/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[130px]" />
      </div>

      {/* Hero */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Decorative Orbital Ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-singularity/5 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] border border-white/5 rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-singularity/20 to-purple-500/20 border border-singularity/30 text-singularity text-xs font-black tracking-[0.2em] uppercase mb-8 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              <Rocket size={14} className="animate-pulse" />
              {isZh ? '持續進化中' : 'Evolutionary Roadmap'}
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter flex flex-wrap justify-center gap-x-2">
              {'ReleaseLog'.split('').map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20, rotateX: -90 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.5 + i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={
                    char === 'L' || char === 'o' || char === 'g'
                      ? 'bg-gradient-to-r from-singularity to-cyan-400 bg-clip-text text-transparent'
                      : 'text-white'
                  }
                >
                  {char}
                </motion.span>
              ))}
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
              {isZh
                ? '追蹤 Gravito 框架的最新發展、核心發布與品牌進化里程碑。'
                : 'Tracking the meta-progression, core deployments, and brand evolution of the Gravito ecosystem.'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="relative pb-40 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Timeline rail with brand gradient */}
          <div className="absolute left-6 md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-singularity/80 via-white/10 to-transparent shadow-[0_0_15px_rgba(0,240,255,0.3)]" />

          {/* Entries */}
          <div className="relative pl-12 md:pl-0 space-y-24">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex flex-col ${index % 2 === 0 ? 'md:items-start' : 'md:items-end'}`}
              >
                <div className="w-full md:w-[calc(50%-40px)]">
                  <ReleaseCard entry={entry} index={index} configMap={configMap} isZh={isZh} />
                </div>
              </div>
            ))}
          </div>

          {/* End marker */}
          <div className="relative flex justify-center pt-20">
            <div className="bg-void px-6 py-2 border border-white/10 rounded-full text-gray-500 text-xs font-mono tracking-widest uppercase">
              {isZh ? '更多精彩即將到來...' : 'Awaiting Next Ignition...'}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}
