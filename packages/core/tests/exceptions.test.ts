import { describe, expect, mock, test } from 'bun:test'
import { GravitoException } from '../src/exceptions/GravitoException'
import { ValidationException } from '../src/exceptions/ValidationException'
import { PlanetCore } from '../src/PlanetCore'

class TestException extends GravitoException {
  constructor() {
    super(400, 'TEST_ERROR', { message: 'Test Message' })
  }
}

describe('Exception Handling', () => {
  test('handles GravitoException as JSON', async () => {
    const core = new PlanetCore()
    core.app.get('/error', () => {
      throw new TestException()
    })

    const res = await core.app.request('/error', {
      headers: { Accept: 'application/json' },
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    const data = json as any
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('TEST_ERROR')
    expect(data.error.message).toBe('Test Message')
  })

  test('handles ValidationException redirect for HTML with flash', async () => {
    const core = new PlanetCore()

    const flashMock = mock((_key: string, _value: unknown) => {})
    const sessionMock = {
      flash: flashMock,
    }

    core.app.use('*', async (c, next) => {
      c.set('session', sessionMock)
      c.set('view', { render: () => '' }) // Enable HTML mode
      await next()
    })

    core.app.get('/form', () => {
      const ex = new ValidationException([{ field: 'email', message: 'Invalid' }])
      ex.withInput({ email: 'bad' })
      throw ex
    })

    const res = await core.app.request('/form', {
      headers: { Accept: 'text/html' },
    })

    expect(res.status).toBe(302)
    expect(flashMock).toHaveBeenCalledTimes(2) // errors + _old_input
    // Check arguments if possible, or just basic flow
  })
})
