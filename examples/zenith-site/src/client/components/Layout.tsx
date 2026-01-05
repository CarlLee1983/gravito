import type React from 'react'
import { StaticLink } from './StaticLink'

export default function Layout({ children }: { children: React.ReactNode }) {
  // Determine active link based on current path
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'

  return (
    <div className="app-layout">
      <header className="main-header">
        <div className="container">
          <StaticLink href="/" className="brand">
            🚀 Gravito Static Site
          </StaticLink>
          <nav>
            <StaticLink href="/" className={path === '/' ? 'active' : ''}>
              Home
            </StaticLink>
            <StaticLink href="/about" className={path.startsWith('/about') ? 'active' : ''}>
              About
            </StaticLink>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="main-footer">
        <div className="container">
          Built with{' '}
          <a href="https://github.com/gravito-framework/gravito" target="_blank" rel="noopener">
            Gravito
          </a>{' '}
          + Inertia + React (Static Site)
        </div>
      </footer>
    </div>
  )
}
