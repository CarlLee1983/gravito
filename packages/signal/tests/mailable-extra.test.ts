import { describe, expect, it, mock } from 'bun:test'
import { Mailable } from '../src/Mailable'

class TestMailable extends Mailable {
  build() {
    return this
  }
}

describe('Mailable Extras', () => {
  it('should handle attachments', () => {
    const mail = new TestMailable()
    mail.attach({ filename: 'test.txt', content: 'hello' })
    expect((mail as any).envelope.attachments).toHaveLength(1)
    expect((mail as any).envelope.attachments[0].filename).toBe('test.txt')
  })

  it('should set view logic', () => {
    const mail = new TestMailable()
    mail.view('emails/welcome', { user: 'Carl' })
    expect((mail as any).renderer).toBeDefined()
    expect((mail as any).renderData.user).toBe('Carl')
  })

  it('should handle queue options', () => {
    const mail = new TestMailable()
    mail.onQueue('low').onConnection('redis').delay(60).withPriority('high')

    expect(mail.queueName).toBe('low')
    expect(mail.connectionName).toBe('redis')
    expect(mail.delaySeconds).toBe(60)
    expect(mail.priority).toBe('high')
  })

  it('should handle locale', () => {
    const mail = new TestMailable()
    mail.locale('zh-TW')
    expect((mail as any).currentLocale).toBe('zh-TW')
  })

  it('should support i18n helper', () => {
    const mail = new TestMailable()
    mail.setTranslator((key) => key.toUpperCase())

    expect(mail.t('hello')).toBe('HELLO')
  })

  it('should safely fail queue() if app not available', async () => {
    const mail = new TestMailable()
    // We are not mocking @gravito/core, so it should hit the catch block and log warning
    // We just ensure it doesn't throw
    await expect(mail.queue()).resolves.toBeUndefined()
  })

  it('should support React renderer builder', async () => {
    const mail = new TestMailable()
    // Mock import mechanics? Hard to test dynamic import in this unit test without mocking module system.
    // Instead we test the builder method sets the resolver.
    mail.react('MyComponent', { prop: 1 })
    expect((mail as any).rendererResolver).toBeDefined()
  })

  it('should support Vue renderer builder', async () => {
    const mail = new TestMailable()
    mail.vue('MyComponent', { prop: 1 })
    expect((mail as any).rendererResolver).toBeDefined()
  })
})
