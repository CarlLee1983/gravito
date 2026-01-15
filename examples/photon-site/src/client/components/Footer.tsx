import React from 'react'
import { Zap, Github, MessageSquare, ExternalLink, Activity } from 'lucide-react'

const footerLinks = [
    {
        title: 'ECOSYSTEM_NODES',
        links: [
            { label: 'Gravito Core', href: 'https://gravito.dev' },
            { label: 'Atlas ORM', href: 'https://atlas.gravito.dev' },
            { label: 'Zenith Plane', href: 'https://zenith.gravito.dev' },
        ]
    },
    {
        title: 'PROTOCOL_RESOURCES',
        links: [
            { label: 'Privacy Policy', href: '/legal/privacy' },
            { label: 'Terms of Use', href: '/legal/terms' },
            { label: 'Architecture Patterns', href: '/patterns' },
            { label: 'Ecosystem Registry', href: '/ecosystem' },
            { label: 'Documentation', href: '/docs/intro' },
        ]
    },
    {
        title: 'EXTERNAL_LINKS',
        links: [
            { label: 'GitHub', href: 'https://github.com/gravito-framework/gravito', icon: Github },
            { label: 'Discussions', href: 'https://github.com/gravito-framework/gravito/discussions', icon: MessageSquare },
            { label: 'NPM Registry', href: 'https://www.npmjs.com/package/@gravito/photon' },
        ]
    }
]

export function Footer() {
    return (
        <footer className="relative bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] pt-24 pb-12 px-12 overflow-hidden transition-colors duration-500">
            {/* Background Decorative Grid */}
            <div className="absolute inset-0 grid-texture pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-24">
                    {/* Brand Info */}
                    <div className="max-w-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 border border-photon-gold/30 flex items-center justify-center bg-photon-gold/5">
                                <Zap size={14} className="text-photon-gold" />
                            </div>
                            <span className="text-xl font-black text-[var(--text-primary)] tracking-tighter uppercase transition-colors">
                                Pho<span className="opacity-50 italic">ton</span>
                            </span>
                        </div>
                        <p className="text-[var(--text-secondary)] text-[11px] font-light tracking-wide leading-relaxed mb-6 transition-colors">
                            The high-performance, zero-copy orchestration engine. <br />
                            Invisible. Atomic. Absolute.
                        </p>
                        <div className="flex items-center gap-4 text-[8px] font-technical tracking-[0.4em] text-[var(--text-muted)] uppercase transition-colors">
                            <span>Licensed_MIT</span>
                            <span>v1.2.0_LATEST</span>
                        </div>
                    </div>

                    {/* Simplified Link Matrix */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-16 md:gap-24">
                        {footerLinks.map((group) => (
                            <div key={group.title} className="flex flex-col gap-6">
                                <h5 className="text-[9px] font-technical font-black text-[var(--text-primary)] opacity-20 tracking-[0.4em] uppercase whitespace-nowrap transition-colors">
                                    // {group.title}
                                </h5>
                                <ul className="flex flex-col gap-3">
                                    {group.links.map((link) => (
                                        <li key={link.label}>
                                            <a
                                                href={link.href}
                                                className="text-[var(--text-secondary)] hover:text-photon-gold text-[11px] transition-colors flex items-center gap-2 group"
                                                target={link.href.startsWith('http') ? '_blank' : undefined}
                                                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                            >
                                                {link.label}
                                                {link.icon && <link.icon size={10} className="opacity-40" />}
                                                {link.href.startsWith('http') && !link.icon && (
                                                    <ExternalLink size={8} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                                                )}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Minimized Copyright Strip */}
                <div className="pt-8 border-t border-[var(--border-subtle)] flex flex-col md:flex-row justify-between items-center gap-6 text-[8px] font-technical tracking-[0.4em] text-[var(--text-muted)] uppercase transition-colors">
                    <div className="flex items-center gap-8">
                        <span className="flex items-center gap-2 text-photon-gold/60">
                            <Activity size={8} />
                            Protocol_Stable
                        </span>
                        <span>© 2026 Gravito_Labs</span>
                    </div>

                    <div className="flex items-center gap-8">
                        <span>Part_of_the_Ecosystem</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
