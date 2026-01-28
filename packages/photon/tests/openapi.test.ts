import { describe, expect, it } from 'bun:test'
import { createRoute, PhotonOpenAPI, z } from '../src/openapi'

describe('Photon OpenAPI', () => {
  it('should create a route with OpenAPI definition', () => {
    const route = createRoute({
      method: 'get',
      path: '/hello',
      responses: {
        200: {
          description: 'Respond a message',
          content: {
            'application/json': {
              schema: z.object({
                message: z.string(),
              }),
            },
          },
        },
      },
    })

    const app = new PhotonOpenAPI()
    app.openapi(route, (c) => {
      return c.json({ message: 'Hello World' }, 200)
    })

    const doc = app.getOpenAPI31Document({
      openapi: '3.1.0',
      info: {
        version: '1.0.0',
        title: 'My API',
      },
    })

    expect(doc.openapi).toBe('3.1.0')
    expect(doc.paths['/hello'].get.responses['200'].description).toBe('Respond a message')
  })
})
