import { describe, expect, it } from 'bun:test'
import { Encrypter } from '../src/security/Encrypter'
import { BunHasher } from '../src/security/Hasher'

describe('Encrypter', () => {
  it('encrypts and decrypts values', () => {
    const key = Encrypter.generateKey()
    const encrypter = new Encrypter({ key })
    const payload = encrypter.encrypt({ token: 'abc' })
    expect(encrypter.decrypt(payload)).toEqual({ token: 'abc' })
  })

  it('rejects invalid key length', () => {
    expect(() => new Encrypter({ key: 'short', cipher: 'aes-128-cbc' })).toThrow()
  })

  it('rejects tampered payloads', () => {
    const key = Encrypter.generateKey()
    const encrypter = new Encrypter({ key })
    const payload = encrypter.encrypt('value')
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
    decoded.mac = decoded.mac.replace(/./, 'x')
    const tampered = Buffer.from(JSON.stringify(decoded)).toString('base64')
    expect(() => encrypter.decrypt(tampered)).toThrow()
  })
})

describe('BunHasher', () => {
  it('hashes and verifies passwords', async () => {
    const hasher = new BunHasher()
    const hash = await hasher.make('secret')
    expect(await hasher.check('secret', hash)).toBe(true)
    expect(await hasher.check('wrong', hash)).toBe(false)
    expect(hasher.needsRehash(hash)).toBe(false)
  })
})
