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
import { ReleaseCanvas } from '../components/ReleaseCanvas'

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
                    ${index % 2 === 0
                        ? 'md:-right-[50px] -left-[51px] md:left-auto'
                        : 'md:-left-[50px] -left-[51px]'
                    }
                    ${entry.featured ? 'border-singularity bg-singularity/20 scale-125' : 'border-white/20 bg-void'}
                `}
            >
                {entry.featured && (
                    <div className="absolute inset-0 rounded-full bg-singularity animate-ping opacity-40" />
                )}
                <div className={`absolute inset-1.5 rounded-full ${entry.featured ? 'bg-singularity' : 'bg-white/40'}`} />
            </div>

            {/* Card Content with Brand Accents */}
            <div
                className={`
                    relative rounded-[2rem] border backdrop-blur-2xl p-8 overflow-hidden transition-all duration-500
                    ${entry.featured
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
                                ${entry.featured
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
                                <Tag size={13} />
                                v{entry.version}
                            </span>
                        )}
                    </div>

                    <div className="ml-auto text-[10px] font-black tracking-widest text-gray-500 uppercase bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        {new Date(entry.date).toLocaleDateString('en-US', {
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
                            ${entry.featured
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
                                            ${entry.featured
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
                            {('ReleaseLog').split('').map((char, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0, y: 20, rotateX: -90 }}
                                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                    transition={{
                                        duration: 0.8,
                                        delay: 0.5 + i * 0.05,
                                        ease: [0.22, 1, 0.36, 1]
                                    }}
                                    className={char === 'L' || char === 'o' || char === 'g' ? 'bg-gradient-to-r from-singularity to-cyan-400 bg-clip-text text-transparent' : 'text-white'}
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
                        {releases.map((entry, index) => (
                            <div key={entry.id} className={`flex flex-col ${index % 2 === 0 ? 'md:items-start' : 'md:items-end'}`}>
                                <div className="w-full md:w-[calc(50%-40px)]">
                                    <ReleaseCard entry={entry} index={index} />
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

