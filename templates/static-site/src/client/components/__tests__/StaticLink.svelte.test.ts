import { render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StaticLink from '../StaticLink.svelte'

describe('StaticLink', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        port: '3000',
      },
    })
  })

  it('renders as anchor tag in static site mode (port 4173)', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        port: '4173',
      },
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/about')
  })

  it('renders as Inertia Link in dev mode (port 3000)', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        port: '3000',
      },
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/about')
  })

  it('renders with custom className', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        port: '4173',
      },
    })

    render(StaticLink, { props: { href: '/about', className: 'custom-class' } })
    const link = screen.getByRole('link')
    expect(link.classList.contains('custom-class')).toBe(true)
  })

  it('renders children content', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        port: '4173',
      },
    })

    const { container } = render(StaticLink, {
      props: { href: '/about' },
    })
    container.querySelector('a')!.textContent = 'About Page'

    expect(container.textContent).toContain('About Page')
  })

  it('detects GitHub Pages as static site', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'username.github.io',
        port: '',
      },
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
  })

  it('detects Vercel as static site', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'my-site.vercel.app',
        port: '',
      },
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
  })

  it('detects Netlify as static site', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'my-site.netlify.app',
        port: '',
      },
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
  })

  it('detects Cloudflare Pages as static site', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'my-site.pages.dev',
        port: '',
      },
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
  })

  it('respects VITE_STATIC_SITE_DOMAINS env variable', () => {
    vi.stubGlobal('import.meta', {
      env: {
        VITE_STATIC_SITE_DOMAINS: 'example.com,www.example.com',
      },
    })

    vi.stubGlobal('window', {
      location: {
        hostname: 'example.com',
        port: '',
      },
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
  })
})
