import { Head, usePage } from '@inertiajs/react'
import { motion } from 'framer-motion'
import {
    BookOpen,
    ExternalLink,
    Globe,
    Package,
    Rocket,
    Sparkles,
    Star,
    Tag,
} from 'lucide-react'
import Layout from '../components/Layout'
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
const releases: ReleaseEntry[] = [
    {
        id: 'lux-launch',
        date: '2025-12-25',
        type: 'announcement',
        title: 'Lux 官網正式上線',
        description:
            'Gravito Lux 主題官網 lux.gravito.dev 正式發布！展示了 Gravito 框架的核心理念與全新視覺設計語言。',
        highlights: [
            '全新「引力核心」視覺主題',
            '完整的中英文雙語文檔',
            'SSG 靜態網站生成支援',
        ],
        links: [
            { label: '訪問官網', url: 'https://lux.gravito.dev' },
            { label: '查看文檔', url: '/docs' },
        ],
        featured: true,
    },
    {
        id: 'v1-rc-1',
        date: '2025-12-25',
        type: 'release',
        version: '1.0.0-rc.1',
        title: 'Gravito v1.0.0 Release Candidate',
        description:
            '所有核心模組進入 RC 階段！包含 gravito-core、@gravito/atlas、@gravito/sentinel、@gravito/fortify 等套件。',
        highlights: [
            'gravito-core: 核心框架穩定',
            '@gravito/atlas: ORM 功能完善',
            '@gravito/sentinel: 認證授權系統',
            '@gravito/monitor: 可觀測性模組',
        ],
        links: [
            { label: 'NPM', url: 'https://www.npmjs.com/org/gravito' },
            { label: 'GitHub', url: 'https://github.com/gravito-framework/gravito' },
        ],
        featured: true,
    },
    {
        id: 'monitor-module',
        date: '2025-12-25',
        type: 'feature',
        title: '@gravito/monitor 可觀測性模組',
        description:
            '新增企業級可觀測性模組，支援 Kubernetes 健康檢查、Prometheus 指標、OpenTelemetry 分散式追蹤。',
        highlights: [
            '/health, /ready, /live K8s 探針',
            'Prometheus 格式 /metrics 端點',
            'OpenTelemetry OTLP 追蹤整合',
        ],
        links: [
            { label: '文檔', url: '/en/docs/guide/observability' },
        ],
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

const typeConfig = {
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

function ReleaseCard({
    entry,
    index,
}: {
    entry: ReleaseEntry
    index: number
}) {
    const config = typeConfig[entry.type]
    const Icon = config.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`relative ${entry.featured ? 'md:-mx-4' : ''}`}
        >
            {/* Timeline dot */}
            <div
                className={`absolute -left-[41px] top-6 w-4 h-4 rounded-full border-2 ${config.border} ${config.bg}`}
            >
                <div
                    className={`absolute inset-1 rounded-full ${entry.featured ? 'bg-singularity animate-pulse' : 'bg-white/20'
                        }`}
                />
            </div>

            {/* Card */}
            <div
                className={`
          rounded-2xl border backdrop-blur-sm p-6
          ${entry.featured
                        ? 'bg-gradient-to-br from-singularity/5 to-purple-500/5 border-singularity/20 shadow-lg shadow-singularity/5'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }
          transition-all duration-300
        `}
            >
                {/* Header */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    {/* Type badge */}
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.bg} ${config.color} ${config.border} border`}
                    >
                        <Icon size={12} />
                        {config.label}
                    </span>

                    {/* Version */}
                    {entry.version && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/20">
                            <Tag size={12} />
                            v{entry.version}
                        </span>
                    )}

                    {/* Date */}
                    <span className="ml-auto text-xs text-gray-500 font-medium">
                        {new Date(entry.date).toLocaleDateString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-black text-white mb-3">{entry.title}</h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed mb-4">{entry.description}</p>

                {/* Highlights */}
                {entry.highlights && entry.highlights.length > 0 && (
                    <ul className="space-y-2 mb-4">
                        {entry.highlights.map((highlight, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                <Rocket size={14} className="mt-0.5 text-singularity shrink-0" />
                                {highlight}
                            </li>
                        ))}
                    </ul>
                )}

                {/* Links */}
                {entry.links && entry.links.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                        {entry.links.map((link, i) => {
                            const isExternal = link.url.startsWith('http')
                            const LinkComponent = isStaticSite() || isExternal ? 'a' : StaticLink

                            return (
                                <LinkComponent
                                    key={i}
                                    href={link.url}
                                    {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-singularity hover:text-cyan-300 transition-colors"
                                >
                                    {isExternal ? <ExternalLink size={14} /> : <BookOpen size={14} />}
                                    {link.label}
                                </LinkComponent>
                            )
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    )
}

export default function Releases() {
    const { props } = usePage<{ locale?: string }>()
    const isZh = props.locale === 'zh'

    return (
        <Layout>
            <Head title={isZh ? '更新日誌 | Gravito' : 'Releases | Gravito'} />

            {/* Hero */}
            <section className="relative pt-32 pb-16 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-singularity/10 border border-singularity/20 text-singularity text-sm font-bold mb-6">
                            <Rocket size={16} />
                            {isZh ? '持續進化中' : 'Evolving'}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                            {isZh ? '更新日誌' : 'Releases & Updates'}
                        </h1>

                        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                            {isZh
                                ? '追蹤 Gravito 框架的最新發展、功能更新與重要里程碑。'
                                : 'Follow the latest developments, feature updates, and milestones of the Gravito framework.'}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Timeline */}
            <section className="relative pb-32 px-6">
                <div className="max-w-3xl mx-auto">
                    {/* Timeline line */}
                    <div className="absolute left-6 md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-singularity/50 via-white/10 to-transparent" />

                    {/* Entries */}
                    <div className="relative pl-12 md:pl-10 space-y-8">
                        {releases.map((entry, index) => (
                            <ReleaseCard key={entry.id} entry={entry} index={index} />
                        ))}
                    </div>

                    {/* End marker */}
                    <div className="relative pl-12 md:pl-10 pt-8">
                        <div className="absolute -left-[41px] top-8 w-4 h-4 rounded-full bg-white/10 border-2 border-white/20" />
                        <p className="text-gray-500 text-sm italic">
                            {isZh ? '更多精彩即將到來...' : 'More coming soon...'}
                        </p>
                    </div>
                </div>
            </section>
        </Layout>
    )
}
