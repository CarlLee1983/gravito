import { Link } from '@inertiajs/react'
import type React from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
    // Determine active link based on current path
    // Note: In real Inertia app, you might use usePage().url
    const path = typeof window !== 'undefined' ? window.location.pathname : '/'

    return (
        <div className="app-layout">
            <header className="main-header">
                <div className="container">
                    <Link href="/" className="brand">
                        🚀 Gravito
                    </Link>
                    <nav>
                        <Link href="/" className={path === '/' ? 'active' : ''}>
                            Home
                        </Link>
                        <Link href="/about" className={path.startsWith('/about') ? 'active' : ''}>
                            About
                        </Link>
                    </nav>
                </div>
            </header>

            <main>{children}</main>

            <footer className="main-footer">
                <div className="container">
                    Built with{' '}
                    <a href="https://github.com/GravitoJS" target="_blank" rel="noopener">
                        Gravito
                    </a>{' '}
                    + Inertia + React
                </div>
            </footer>
        </div>
    )
}
