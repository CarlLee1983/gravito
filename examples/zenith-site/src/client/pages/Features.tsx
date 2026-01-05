import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import {
    Activity,
    Cpu,
    Database,
    Globe,
    HardDrive,
    Layers,
    Shield,
    Zap,
} from 'lucide-react'
import React from 'react'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { useTrans } from '../hooks/useTrans'

export default function Features() {
    const { trans, locale } = useTrans()

    return (
        <div className="min-h-screen bg-zenith-void text-white selection:bg-zenith-accent selection:text-zenith-void overflow-x-hidden font-sans">
            <Head title={`${trans('nav.features')} - Gravito Zenith`} />

            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden border-b border-white/5">
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.05)_0%,transparent_70%)]" />
                    <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                            backgroundSize: '40px 40px',
                        }}
                    />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
                            {trans('features_deep.title')}{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zenith-400 to-zenith-accent">
                                {trans('features_deep.titleHighlight')}
                            </span>
                        </h1>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
                            {trans('features_deep.subtitle')}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Persistence Architecture */}
            <section className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">{trans('features_deep.persistence.title')}</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">{trans('features_deep.persistence.description')}</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 relative group overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-zenith-pulse/10 blur-[60px] rounded-full group-hover:scale-150 transition-transform" />
                            <Layers className="w-12 h-12 text-zenith-pulse mb-6" />
                            <h3 className="text-xl font-bold mb-4">{trans('features_deep.persistence.redis.title')}</h3>
                            <p className="text-gray-400 leading-relaxed">
                                {trans('features_deep.persistence.redis.content')}
                            </p>
                            <div className="mt-8 flex items-center gap-2 text-xs font-mono text-zenith-pulse/60">
                                <Activity size={12} /> LATENCY: &lt; 0.5ms
                            </div>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -5 }}
                            className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 relative group overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-zenith-stellar/10 blur-[60px] rounded-full group-hover:scale-150 transition-transform" />
                            <Database className="w-12 h-12 text-zenith-stellar mb-6" />
                            <h3 className="text-xl font-bold mb-4">{trans('features_deep.persistence.sql.title')}</h3>
                            <p className="text-gray-400 leading-relaxed">
                                {trans('features_deep.persistence.sql.content')}
                            </p>
                            <div className="mt-8 flex items-center gap-2 text-xs font-mono text-zenith-stellar/60">
                                <Shield size={12} /> PERSISTENCE: 100%
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* GPP Protocol Deep Dive */}
            <section className="py-24 bg-black/40 border-y border-white/5 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-1">
                            <h2 className="text-3xl font-bold mb-6">{trans('features_deep.protocol.title')}</h2>
                            <p className="text-gray-400 leading-relaxed mb-8">
                                {trans('features_deep.protocol.description')}
                            </p>
                            <div className="p-6 rounded-2xl bg-zenith-accent/5 border border-zenith-accent/10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-2 h-2 rounded-full bg-zenith-accent animate-pulse" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-zenith-accent">Protocol Active</span>
                                </div>
                                <div className="space-y-2 font-mono text-[10px] text-gray-500">
                                    <div>HEAD: GPP_V1</div>
                                    <div>MTU: 1500 BYTES</div>
                                    <div>AUTH: SHARD_SECRET</div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
                            <ProtocolFeature
                                icon={<Zap />}
                                title={trans('features_deep.protocol.feature1.title')}
                                content={trans('features_deep.protocol.feature1.content')}
                            />
                            <ProtocolFeature
                                icon={<Globe />}
                                title={trans('features_deep.protocol.feature2.title')}
                                content={trans('features_deep.protocol.feature2.content')}
                            />
                            <ProtocolFeature
                                icon={<HardDrive />}
                                title={trans('features_deep.protocol.feature3.title')}
                                content={trans('features_deep.protocol.feature3.content')}
                            />
                            <ProtocolFeature
                                icon={<Cpu />}
                                title={locale === 'zh-TW' ? '超低開銷' : 'Ultra-Low Overhead'}
                                content={locale === 'zh-TW' ? 'GPP 專為並發性能優化，確保監控本身不會成為系統的瓶頸。' : 'GPP is optimized for concurrency, ensuring observability doesnt become a bottleneck.'}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Metrics Section */}
            <section className="py-24 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-br from-white/[0.03] to-transparent rounded-3xl border border-white/10 p-12">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl font-bold mb-2 uppercase tracking-widest text-gray-500">{trans('features_deep.performance.title')}</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-12 text-center">
                            <div>
                                <div className="text-4xl lg:text-5xl font-mono font-bold text-zenith-accent mb-4">&lt; 0.1ms</div>
                                <p className="text-gray-400 text-sm uppercase tracking-tighter">{trans('features_deep.performance.latency')}</p>
                            </div>
                            <div>
                                <div className="text-4xl lg:text-5xl font-mono font-bold text-green-400 mb-4">50K+</div>
                                <p className="text-gray-400 text-sm uppercase tracking-tighter">{trans('features_deep.performance.throughput')}</p>
                            </div>
                            <div>
                                <div className="text-4xl lg:text-5xl font-mono font-bold text-zenith-stellar mb-4">99.99%</div>
                                <p className="text-gray-400 text-sm uppercase tracking-tighter">{trans('features_deep.performance.reliability')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

function ProtocolFeature({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
    return (
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 mb-4 group-hover:text-zenith-accent transition-colors">
                {icon}
            </div>
            <h4 className="font-bold mb-2">{title}</h4>
            <p className="text-sm text-gray-500 leading-relaxed">
                {content}
            </p>
        </div>
    )
}
