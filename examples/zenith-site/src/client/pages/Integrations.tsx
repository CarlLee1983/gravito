import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import {
    Cloud,
    Code2,
    Cpu,
    Database,
    Link,
    Milestone,
    Network,
    Share2,
    Zap,
} from 'lucide-react'
import React from 'react'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { useTrans } from '../hooks/useTrans'

export default function Integrations() {
    const { trans, locale } = useTrans()

    return (
        <div className="min-h-screen bg-zenith-void text-white selection:bg-zenith-accent selection:text-zenith-void overflow-x-hidden font-sans">
            <Head title={`${trans('nav.integration')} - Gravito Zenith`} />
            <Navbar />

            {/* Immersive connectivity Hero */}
            <section className="relative pt-40 pb-28 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.08)_0%,transparent_70%)]" />
                    <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent top-1/2" />
                    <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent left-1/2" />
                    <div className="absolute inset-0 bg-grid-zenith opacity-20" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-1 rounded-full bg-zenith-accent/5 border border-zenith-accent/20 text-zenith-accent text-[10px] font-mono mb-10 tracking-[0.4em] uppercase">
                            <Network size={12} className="opacity-60" /> CONNECTIVITY_STABLE
                        </div>
                        <h1 className="text-6xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]">
                            {trans('integrations.title')}{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-zenith-400 via-zenith-accent to-zenith-stellar text-glow">
                                {trans('integrations.titleHighlight')}
                            </span>
                        </h1>
                        <p className="text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
                            {trans('integrations.subtitle')}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Native Expansion: Laravel Zenith */}
            <section className="py-32 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="space-y-10"
                        >
                            <div>
                                <div className="text-xs font-mono text-zenith-accent/60 tracking-[0.3em] uppercase mb-4">Phase_01: In-App_Insight</div>
                                <h2 className="text-5xl font-bold tracking-tight mb-6 leading-tight">{trans('integrations.laravel.title')}</h2>
                                <p className="text-gray-300 text-xl font-light leading-relaxed">
                                    {trans('integrations.laravel.description')}
                                </p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-6">
                                <IntegrationFeature icon={<Link />} text={trans('integrations.laravel.feature1')} />
                                <IntegrationFeature icon={<Share2 />} text={trans('integrations.laravel.feature2')} />
                                <IntegrationFeature icon={<Cpu />} text={trans('integrations.laravel.feature3')} />
                                <IntegrationFeature icon={<Zap />} text="Real-time Operational Streams" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative group"
                        >
                            <div className="absolute -inset-8 bg-zenith-accent/5 blur-[100px] rounded-full group-hover:bg-zenith-accent/10 transition-all duration-1000" />
                            <div className="relative zenith-glass-strong rounded-[2.5rem] p-1 border border-white/10 overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                <div className="bg-black/60 p-10 font-mono text-sm space-y-4">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                        <span className="ml-4 text-[10px] text-white/20 uppercase tracking-widest">Setup_Protocol</span>
                                    </div>
                                    <div className="text-gray-500">// Require via composer</div>
                                    <div className="text-zenith-accent">composer require <span className="text-white">gravito-framework/laravel-zenith</span></div>
                                    <div className="h-2" />
                                    <div className="text-gray-500">// Ignite the portal</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-zenith-stellar">Zenith</span>
                                        <span className="text-white">::</span>
                                        <span className="text-zenith-accent">ignite</span>
                                        <span className="text-white">();</span>
                                    </div>
                                    <div className="h-6" />
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-[10px] text-white/30 tracking-widest">STATUS: READY</span>
                                        <div className="flex gap-1">
                                            {[...Array(8)].map((_, i) => (
                                                <div key={i} className="w-1 h-3 bg-zenith-accent/20 rounded-full" />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Distributed Grid: Quasar Agents */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/[0.01] border-y border-white/5" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <div className="lg:order-2 space-y-10">
                            <div>
                                <div className="text-xs font-mono text-zenith-stellar/60 tracking-[0.3em] uppercase mb-4">Phase_02: Orbital_Control</div>
                                <h2 className="text-5xl font-bold tracking-tight mb-6 leading-tight">{trans('integrations.quasar.title')}</h2>
                                <p className="text-gray-300 text-xl font-light leading-relaxed">
                                    {trans('integrations.quasar.description')}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                <IntegrationFeature icon={<Network />} text={trans('integrations.quasar.feature1')} />
                                <IntegrationFeature icon={<Cpu />} text={trans('integrations.quasar.feature2')} />
                                <IntegrationFeature icon={<Zap />} text={trans('integrations.quasar.feature3')} />
                            </div>
                        </div>

                        <div className="lg:order-1 relative">
                            <div className="grid grid-cols-2 gap-6 p-4">
                                {[1, 2, 3, 4].map(i => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        viewport={{ once: true }}
                                        whileHover={{ y: -5, borderColor: 'rgba(168, 85, 247, 0.3)' }}
                                        className="p-8 rounded-[2rem] zenith-glass flex flex-col items-center justify-center gap-6 group transition-all"
                                    >
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-zenith-stellar/20 rounded-full blur-xl animate-pulse" />
                                            <div className="relative w-14 h-14 rounded-2xl bg-zenith-stellar/10 border border-zenith-stellar/20 flex items-center justify-center text-zenith-stellar group-hover:scale-110 transition-transform">
                                                <Cloud size={28} />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-1">
                                            <span className="block text-xs font-mono text-white/40 tracking-widest uppercase">Node_Alpha_{i}02</span>
                                            <span className="block text-[10px] text-green-400 font-bold uppercase tracking-tighter">Heartbeat Stable</span>
                                        </div>
                                        <div className="w-full flex items-center gap-2">
                                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: '65%' }}
                                                    className="h-full bg-zenith-stellar"
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono text-white/20">65%</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            {/* Connector visual effects */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-zenith-stellar/5 blur-[120px] -z-10" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Global Ecosystem Infrastructure */}
            <section className="py-32 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">{trans('integrations.ecosystem.title')}</h2>
                        <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-10">
                        <EcosystemCard
                            icon={<Zap className="text-orange-400" />}
                            title="Redis"
                            content={trans('integrations.ecosystem.redis')}
                            tag="TRANSPORT"
                        />
                        <EcosystemCard
                            icon={<Database className="text-blue-400" />}
                            title="Persistent DB"
                            content={trans('integrations.ecosystem.sql')}
                            tag="ARCHIVE"
                        />
                        <EcosystemCard
                            icon={<Cloud className="text-zenith-accent" />}
                            title="Infrastructure"
                            content={trans('integrations.ecosystem.cloud')}
                            tag="ORCHESTRATION"
                        />
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

function IntegrationFeature({ icon, text }: { icon: React.ReactNode, text: string }) {
    return (
        <div className="flex items-center gap-4 text-gray-400 group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zenith-accent group-hover:bg-zenith-accent/10 group-hover:border-zenith-accent/20 transition-all">
                {icon}
            </div>
            <span className="text-sm font-light tracking-wide group-hover:text-white transition-colors">{text}</span>
        </div>
    )
}

function EcosystemCard({ icon, title, content, tag }: { icon: React.ReactNode, title: string, content: string, tag: string }) {
    return (
        <motion.div
            whileHover={{ y: -10 }}
            className="p-10 rounded-[3rem] zenith-glass relative group overflow-hidden transition-all"
        >
            <div className="absolute top-0 right-0 p-8 text-[10px] font-mono text-white/10 tracking-[0.3em] group-hover:text-white/30 transition-colors">
                {tag}
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500 border border-white/5">
                {React.cloneElement(icon as React.ReactElement<any>, { size: 32 })}
            </div>
            <h3 className="text-2xl font-bold mb-4 tracking-tight">{title}</h3>
            <p className="text-gray-500 leading-relaxed font-light">
                {content}
            </p>
            <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-white/20">
                <Code2 size={12} /> INTERFACE_V2_ACTIVE
            </div>
        </motion.div>
    )
}
