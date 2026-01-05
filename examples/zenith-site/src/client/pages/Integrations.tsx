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

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden border-b border-white/5">
                <div className="absolute inset-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-zenith-pulse/5 rounded-full blur-[150px] opacity-40" />
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '30px 30px' }} />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8">
                            {trans('integrations.title')}{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zenith-400 to-zenith-accent">
                                {trans('integrations.titleHighlight')}
                            </span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                            {trans('integrations.subtitle')}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Primary Integration: Laravel Zenith */}
            <section className="py-24 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zenith-500/10 border border-zenith-500/20 text-zenith-400 text-xs font-mono mb-6">
                                <Code2 className="w-3 h-3" /> NATIVE INSPECTOR
                            </div>
                            <h2 className="text-4xl font-bold mb-6">{trans('integrations.laravel.title')}</h2>
                            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                {trans('integrations.laravel.description')}
                            </p>
                            <div className="space-y-4">
                                <IntegrationFeature icon={<Link />} text={trans('integrations.laravel.feature1')} />
                                <IntegrationFeature icon={<Share2 />} text={trans('integrations.laravel.feature2')} />
                                <IntegrationFeature icon={<Cpu />} text={trans('integrations.laravel.feature3')} />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-zenith-500/20 to-zenith-stellar/20 blur-xl opacity-50" />
                            <div className="relative z-10 font-mono text-sm space-y-2">
                                <div className="text-gray-500"># composer.json</div>
                                <div className="text-zenith-accent">"gravito-framework/laravel-zenith": "^1.0"</div>
                                <div className="h-4" />
                                <div className="text-gray-500"># config/app.php</div>
                                <div className="text-gray-300">Zenith\ZenithServiceProvider::class</div>
                                <div className="h-4" />
                                <div className="text-gray-400 italic">// One boot to rule them all</div>
                                <div className="text-zenith-stellar">Zenith::ignite();</div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Distributed Agents: Quasar */}
            <section className="py-24 bg-white/[0.01] border-y border-white/5 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center lg:flex-row-reverse">
                        <div className="lg:order-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zenith-stellar/10 border border-zenith-stellar/20 text-zenith-stellar text-xs font-mono mb-6">
                                <Milestone className="w-3 h-3" /> MULTI-NODE AGENTS
                            </div>
                            <h2 className="text-4xl font-bold mb-6">{trans('integrations.quasar.title')}</h2>
                            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                {trans('integrations.quasar.description')}
                            </p>
                            <div className="space-y-4">
                                <IntegrationFeature icon={<Network />} text={trans('integrations.quasar.feature1')} />
                                <IntegrationFeature icon={<Cpu />} text={trans('integrations.quasar.feature2')} />
                                <IntegrationFeature icon={<Zap />} text={trans('integrations.quasar.feature3')} />
                            </div>
                        </div>

                        <div className="lg:order-1 relative">
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        viewport={{ once: true }}
                                        className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-3 group hover:bg-white/[0.05] transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-zenith-stellar/10 flex items-center justify-center text-zenith-stellar group-hover:scale-110 transition-transform">
                                            <Cloud size={20} />
                                        </div>
                                        <span className="text-xs font-mono text-gray-500">Agent Node {i}</span>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="w-1/2 h-full bg-zenith-stellar animate-pulse" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="absolute -inset-4 bg-zenith-stellar/5 blur-3xl -z-10" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Ecosystem & Infrastructure */}
            <section className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">{trans('integrations.ecosystem.title')}</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <EcosystemCard
                            icon={<Zap className="text-orange-400" />}
                            title="Redis"
                            content={trans('integrations.ecosystem.redis')}
                        />
                        <EcosystemCard
                            icon={<Database className="text-blue-400" />}
                            title="Persistent DB"
                            content={trans('integrations.ecosystem.sql')}
                        />
                        <EcosystemCard
                            icon={<Cloud className="text-zenith-accent" />}
                            title="Infrastructure"
                            content={trans('integrations.ecosystem.cloud')}
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
        <div className="flex items-center gap-3 text-gray-300">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zenith-accent flex-shrink-0">
                {icon}
            </div>
            <span className="text-sm font-medium">{text}</span>
        </div>
    )
}

function EcosystemCard({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all text-center"
        >
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
                {content}
            </p>
        </motion.div>
    )
}
