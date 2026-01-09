import { describe, expect, it } from 'bun:test'
import { CookieJar } from '../src/http/CookieJar'
import { Encrypter } from '../src/security/Encrypter'

describe('CookieJar', () => {
  it('queues and attaches cookies with options', () => {
    const headers: string[] = []
    const ctx = {
      header: (_name: string, value: string, options?: { append?: boolean }) => {
        if (options?.append) {
          headers.push(value)
        } else {
          headers.splice(0, headers.length, value)
        }
      },
    }

    const encrypter = new Encrypter({ key: Encrypter.generateKey() })
    const jar = new CookieJar(encrypter)

    jar.queue('token', 'secret', 5, { path: '/', httpOnly: true, encrypt: true })
    jar.forever('theme', 'dark', { sameSite: 'Lax' })
    jar.forget('session')

    jar.attach(ctx as any)

    expect(headers.length).toBe(3)
    expect(headers[0]).toContain('token=')
    expect(headers[0]).toContain('Max-Age=300')
    expect(headers[0]).toContain('HttpOnly')
    expect(headers[0]).toContain('Path=/')

    const tokenCookie = headers[0].split(';')[0]
    const tokenValue = decodeURIComponent(tokenCookie.split('=')[1] || '')
    expect(encrypter.decrypt(tokenValue)).toBe('secret')

    expect(headers[1]).toContain('theme=')
    expect(headers[1]).toContain('Max-Age=157680000')
    expect(headers[1]).toContain('SameSite=Lax')

    expect(headers[2]).toContain('session=')
    expect(headers[2]).toContain('Max-Age=0')
    expect(headers[2]).toContain('Expires=')
  })

  it('throws when encrypting without encrypter', () => {
    const jar = new CookieJar()
    expect(() => jar.queue('token', 'secret', 5, { encrypt: true })).toThrow()
  })
})
