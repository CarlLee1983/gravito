import { describe, expect, it } from 'bun:test'
import site from '../src/index'

describe('@gravito/site', () => {
  it('responds to the health check', async () => {
    const res = await site.fetch(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('OK')
  })

  it('redirects root to /en', async () => {
    const res = await site.fetch(new Request('http://localhost/'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/en')
  })

  it('renders the localized landing page', async () => {
    const res = await site.fetch(new Request('http://localhost/en'))
    const body = await res.text()
    expect(res.status).toBe(200)
    expect(body).toContain('Gravito Framework')
    expect(body).toContain('Documentation')
  })

  it('renders docs with SEO metadata', async () => {
    const res = await site.fetch(new Request('http://localhost/en/docs/intro'))
    const body = await res.text()
    expect(res.status).toBe(200)
    expect(body).toContain('Introduction to Gravito')
    expect(body).toContain('The future of web development.')
    expect(body).toContain('og:title')
    expect(body).toContain('twitter:card')
  })

  it('returns 404 for missing docs', async () => {
    const res = await site.fetch(new Request('http://localhost/en/docs/missing'))
    expect(res.status).toBe(404)
  })
})
