import { Github, Globe, LayoutDashboard } from 'lucide-react'
import React from 'react'
import { StaticLink } from './StaticLink'
import { useTrans } from '../hooks/useTrans'
import { usePage } from '@inertiajs/react'

export function Navbar() {
    const { trans, locale } = useTrans()
    const { version } = usePage().props as { version?: string }

    return (
        <nav className="fixed w-full z-50 border-b border-white/5 bg-zenith-void/60 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <StaticLink href={locale === 'zh-TW' ? '/zh-TW' : '/'} className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded bg-gradient-to-br from-zenith-500 to-zenith-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold tracking-wider">ZENITH</span>
                        </StaticLink>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <StaticLink
                            href={locale === 'zh-TW' ? '/zh-TW/features' : '/features'}
                            className={`transition-colors ${usePage().url.includes('features') ? 'text-white border-b-2 border-zenith-accent pb-1' : 'hover:text-white'}`}
                        >
                            {trans('nav.features')}
                        </StaticLink>
                        <StaticLink
                            href={locale === 'zh-TW' ? '/zh-TW/integrations' : '/integrations'}
                            className={`transition-colors ${usePage().url.includes('integrations') ? 'text-white border-b-2 border-zenith-accent pb-1' : 'hover:text-white'}`}
                        >
                            {trans('nav.integration')}
                        </StaticLink>
                        <StaticLink
                            href={locale === 'zh-TW' ? '/zh-TW/about' : '/about'}
                            className={`transition-colors ${usePage().url.includes('about') ? 'text-white border-b-2 border-zenith-accent pb-1' : 'hover:text-white'}`}
                        >
                            {trans('nav.about')}
                        </StaticLink>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <button
                                type="button"
                                className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1"
                            >
                                <Globe className="w-5 h-5" />
                                <span className="text-xs font-mono">{locale === 'zh-TW' ? '繁中' : 'EN'}</span>
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-32 bg-zenith-800 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                                <StaticLink
                                    href={locale === 'zh-TW' ? '/' : '/zh-TW'}
                                    className="block px-4 py-2 text-sm hover:bg-zenith-accent/20 transition-colors text-left"
                                >
                                    {locale === 'zh-TW' ? 'English' : '繁體中文'}
                                </StaticLink>
                                <StaticLink
                                    href={locale === 'zh-TW' ? '/about' : '/zh-TW/about'}
                                    className="block px-4 py-2 text-sm hover:bg-zenith-accent/20 transition-colors text-left border-t border-white/5"
                                >
                                    {locale === 'zh-TW' ? 'About (EN)' : '關於 (繁中)'}
                                </StaticLink>
                            </div>
                        </div>
                        <a
                            href="https://github.com/gravito-work/gravito"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <Github className="w-5 h-5" />
                        </a>
                        <button
                            type="button"
                            className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded text-sm font-medium transition-colors border border-white/10"
                        >
                            <span>v{version || '0.1.0'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    )
}
