/**
 * Bun Native - Baseline Benchmark
 *
 * Pure Bun.serve without any framework
 * This represents the theoretical maximum performance
 */

const server = Bun.serve({
  port: 3003,
  fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/') {
      return new Response(JSON.stringify({ message: 'Hello, World!' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Not Found', { status: 404 })
  },
})

console.log(`Bun Native running on http://localhost:${server.port}`)
