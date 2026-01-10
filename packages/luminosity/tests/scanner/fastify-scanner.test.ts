import { describe, expect, it } from 'bun:test'
import { FastifyScanner } from '../../src/scanner/adapters/FastifyScanner'

describe('FastifyScanner', () => {
  it('collects routes via hook', async () => {
    const scanner = new FastifyScanner()

    // Simulate Fastify calls
    scanner.collect({ method: 'GET', url: '/hello' })
    scanner.collect({ method: ['POST', 'GET'], url: '/api/data' })

    const routes = await scanner.scan()

    expect(routes.length).toBe(3)

    const paths = routes.map((r) => r.path).sort()
    expect(paths).toEqual(['/api/data', '/api/data', '/hello'])

    const methods = routes.map((r) => r.method).sort()
    expect(methods).toEqual(['GET', 'GET', 'POST'])
  })

  it('handles dynamic routes', async () => {
    const scanner = new FastifyScanner()
    scanner.collect({ method: 'GET', url: '/users/:id' })

    const routes = await scanner.scan()
    const route = routes[0]

    expect(route.path).toBe('/users/:id')
    expect(route.isDynamic).toBe(true)
    expect(route.params).toEqual(['id'])
  })

  it('filters routes', async () => {
    const scanner = new FastifyScanner({
      excludePatterns: ['/admin*'],
    })

    scanner.collect({ method: 'GET', url: '/public' })
    scanner.collect({ method: 'GET', url: '/admin/users' })

    const routes = await scanner.scan()
    expect(routes.length).toBe(1)
    expect(routes[0].path).toBe('/public')
  })
})
