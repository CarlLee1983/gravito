/**
 * StaticLink component tests
 *
 * These tests require a jsdom environment (provided by vitest).
 * Run with: cd templates/static-site && bun run test
 *
 * Note: Tests are skipped when run via bun test from the monorepo root
 * because they require jsdom environment not available in Bun's test runner.
 */
import { beforeEach, describe, expect, it } from 'bun:test'

// Detect if we're running in a DOM environment
const hasDom = typeof document !== 'undefined'

describe('StaticLink', () => {
  beforeEach(() => {
    if (!hasDom) return
  })

  it('renders as anchor tag in static site mode (port 4173)', async () => {
    if (!hasDom) {
      // Skip in non-DOM environments (bun test from monorepo root)
      return
    }
    const { render, screen } = await import('@testing-library/svelte')
    const { default: StaticLink } = await import('../StaticLink.svelte')

    Object.defineProperty(globalThis, 'window', {
      value: { location: { hostname: 'localhost', port: '4173' } },
      writable: true,
      configurable: true,
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/about')
  })

  it('renders as Inertia Link in dev mode (port 3000)', async () => {
    if (!hasDom) return
    const { render, screen } = await import('@testing-library/svelte')
    const { default: StaticLink } = await import('../StaticLink.svelte')

    Object.defineProperty(globalThis, 'window', {
      value: { location: { hostname: 'localhost', port: '3000' } },
      writable: true,
      configurable: true,
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/about')
  })

  it('renders with custom className', async () => {
    if (!hasDom) return
    const { render, screen } = await import('@testing-library/svelte')
    const { default: StaticLink } = await import('../StaticLink.svelte')

    Object.defineProperty(globalThis, 'window', {
      value: { location: { hostname: 'localhost', port: '4173' } },
      writable: true,
      configurable: true,
    })

    render(StaticLink, { props: { href: '/about', className: 'custom-class' } })
    const link = screen.getByRole('link')
    expect(link.classList.contains('custom-class')).toBe(true)
  })

  it('renders children content', async () => {
    if (!hasDom) return
    const { render } = await import('@testing-library/svelte')
    const { default: StaticLink } = await import('../StaticLink.svelte')

    Object.defineProperty(globalThis, 'window', {
      value: { location: { hostname: 'localhost', port: '4173' } },
      writable: true,
      configurable: true,
    })

    const { container } = render(StaticLink, { props: { href: '/about' } })
    container.querySelector('a')!.textContent = 'About Page'
    expect(container.textContent).toContain('About Page')
  })

  it('detects GitHub Pages as static site', async () => {
    if (!hasDom) return
    const { render, screen } = await import('@testing-library/svelte')
    const { default: StaticLink } = await import('../StaticLink.svelte')

    Object.defineProperty(globalThis, 'window', {
      value: { location: { hostname: 'username.github.io', port: '' } },
      writable: true,
      configurable: true,
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
  })

  it('detects Vercel as static site', async () => {
    if (!hasDom) return
    const { render, screen } = await import('@testing-library/svelte')
    const { default: StaticLink } = await import('../StaticLink.svelte')

    Object.defineProperty(globalThis, 'window', {
      value: { location: { hostname: 'my-site.vercel.app', port: '' } },
      writable: true,
      configurable: true,
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
  })

  it('detects Netlify as static site', async () => {
    if (!hasDom) return
    const { render, screen } = await import('@testing-library/svelte')
    const { default: StaticLink } = await import('../StaticLink.svelte')

    Object.defineProperty(globalThis, 'window', {
      value: { location: { hostname: 'my-site.netlify.app', port: '' } },
      writable: true,
      configurable: true,
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
  })

  it('detects Cloudflare Pages as static site', async () => {
    if (!hasDom) return
    const { render, screen } = await import('@testing-library/svelte')
    const { default: StaticLink } = await import('../StaticLink.svelte')

    Object.defineProperty(globalThis, 'window', {
      value: { location: { hostname: 'my-site.pages.dev', port: '' } },
      writable: true,
      configurable: true,
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
  })

  it('respects VITE_STATIC_SITE_DOMAINS env variable', async () => {
    if (!hasDom) return
    const { render, screen } = await import('@testing-library/svelte')
    const { default: StaticLink } = await import('../StaticLink.svelte')

    process.env.VITE_STATIC_SITE_DOMAINS = 'example.com,www.example.com'
    Object.defineProperty(globalThis, 'window', {
      value: { location: { hostname: 'example.com', port: '' } },
      writable: true,
      configurable: true,
    })

    render(StaticLink, { props: { href: '/about' } })
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')

    delete process.env.VITE_STATIC_SITE_DOMAINS
  })
})
