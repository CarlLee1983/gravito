import { bench, group, run } from 'mitata'
import { Gravito } from '../src/engine/Gravito'

const app = new Gravito()

// Register 100 routes
for (let i = 0; i < 100; i++) {
  app.get(`/route-${i}`, (c) => c.text(`Response ${i}`))
}

app.get('/user/:id', (c) => c.text(`User ${c.req.param('id')}`))

group('Router Performance', () => {
  bench('Static Route Matching', () => {
    app.fetch(new Request('http://localhost/route-50'))
  })

  bench('Dynamic Route Matching', () => {
    app.fetch(new Request('http://localhost/user/123'))
  })

  bench('404 Route', () => {
    app.fetch(new Request('http://localhost/not-found'))
  })
})

await run()
