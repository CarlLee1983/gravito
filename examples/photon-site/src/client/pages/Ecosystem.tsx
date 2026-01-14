import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { motion } from 'framer-motion'
import {
    Cpu, Zap, Shield, Database, Layout,
    Box, ExternalLink, Download, Gift, Layers,
    Activity, Globe, Lock, ChevronRight
} from 'lucide-react'
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

const orbits: Orbit[] = [
    {
        name: 'Sentinel',
        package: '@gravito/sentinel',
        description: 'Advanced authentication and authorization kernel. JWT, OAuth2, and RBAC support.',
        icon: Shield,
        type: 'OFFICIAL',
        features: ['JWE Support', 'Session Shield', 'Role Management']
    },
    {
        name: 'Atlas',
        package: '@gravito/atlas',
        description: 'The heavyweight Data Mapper ORM for Photon. High-speed SQL orchestration.',
        icon: Database,
        type: 'OFFICIAL',
        features: ['AOT Queries', 'Hybrid Drivers', 'Entity Mapping']
    },
    {
        name: 'Prism',
        package: '@gravito/prism',
        description: 'Native template engine with Blade-inspired syntax and pre-compiled rendering.',
        icon: Layout,
        type: 'OFFICIAL',
        features: ['Logic Blocks', 'Layout Yields', 'High-Speed JIT']
    },
    {
        name: 'Ion',
        package: '@gravito/ion',
        description: 'Internal SPA Bridge for Inertia.js. Build modern monoliths easily.',
        icon: Zap,
        type: 'OFFICIAL',
        features: ['Shared State', 'Handshake Protocol', 'Asset Versioning']
    }
]

export default function Ecosystem() {
    return (
        <DocsLayout currentId="ecosystem">
            <Head title="Ecosystem Orbits | Photon Engine" />

            <div className="mb-20">
                <div className="flex items-center gap-3 mb-6">
                    <div className="px-2 py-0.5 bg-photon-gold/10 border border-photon-gold/20 rounded text-[10px] text-photon-gold font-technical tracking-[0.2em] uppercase">
                        Registry_v1.1
                    </div>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-p-txt uppercase tracking-tighter mb-8 leading-[0.95]">
                    Ecosystem<br />
                    <span className="text-photon-gold">Orbits</span>
                </h1>
                <p className="text-xl text-s-txt font-light max-w-2xl leading-relaxed">
                    Photon is an atomic core. Extend its capabilities using Orbits—plug-and-play modules designed for the Gravito framework.
                </p>
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
                        <div className={`absolute top-8 right-8 w-1 h-1 rounded-full ${orbit.type === 'OFFICIAL' ? 'bg-photon-gold shadow-[0_0_8px_rgba(255,184,0,0.5)]' : 'bg-gray-400'}`} />

                        <div className="flex items-center gap-6 mb-8">
                            <div className="w-14 h-14 border border-s-brd flex items-center justify-center bg-surf-bg group-hover:border-photon-gold/30 transition-colors">
                                <orbit.icon size={24} strokeWidth={1.5} className="text-m-txt group-hover:text-photon-gold transition-colors" />
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
                            {orbit.features.map(feat => (
                                <div key={feat} className="flex items-center gap-3 text-[10px] font-technical text-m-txt uppercase tracking-widest">
                                    <div className="w-1 h-px bg-photon-gold/30" />
                                    {feat}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-s-brd">
                            <div className="text-[9px] font-technical text-m-txt tracking-[0.2em] uppercase">
                                Type: {orbit.type}
                            </div>
                            <button className="flex items-center gap-2 text-[10px] font-technical text-photon-gold/60 hover:text-photon-gold transition-colors uppercase tracking-[0.2em]">
                                <Download size={12} /> Install_Shell
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
                    Build Your Own <span className="text-photon-gold">Orbit</span>
                </h2>
                <p className="text-s-txt max-w-xl mb-8 relative z-10 leading-relaxed">
                    Have a micro-service or utility that benefits the Gravito ecosystem? Join the registry and provide atomic power to thousands of nodes.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                    <a href="#" className="inline-flex items-center gap-3 px-6 py-3 bg-surf-bg border border-s-brd text-[11px] font-technical text-p-txt uppercase tracking-widest hover:bg-photon-gold hover:text-black hover:border-photon-gold transition-all">
                        Registry Documentation <ChevronRight size={14} />
                    </a>
                </div>
            </div>
        </DocsLayout>
    )
}
