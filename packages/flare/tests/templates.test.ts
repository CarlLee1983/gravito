import { describe, expect, it } from 'bun:test'
import { TemplatedNotification } from '../src/templates/NotificationTemplate'
import type { Notifiable } from '../src/types'

const notifiable: Notifiable & { email: string } = {
  getNotifiableId: () => '1',
  email: 'test@example.com',
}

class WelcomeNotification extends TemplatedNotification {
  via() {
    return ['mail']
  }

  protected mailTemplate() {
    return {
      subject: 'Welcome, {{name}}!',
      view: 'emails.welcome',
      data: { role: 'user' },
    }
  }
}

describe('TemplatedNotification', () => {
  it('should interpolate data into template', () => {
    const notification = new WelcomeNotification().with({ name: 'John' })
    const mail = notification.toMail(notifiable)

    expect(mail.subject).toBe('Welcome, John!')
    expect(mail.to).toBe('test@example.com')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mail.data as any).name).toBe('John')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mail.data as any).role).toBe('user')
  })

  it('should handle missing data gracefully', () => {
    const notification = new WelcomeNotification()
    const mail = notification.toMail(notifiable)

    expect(mail.subject).toBe('Welcome, {{name}}!')
  })

  it('should throw if notifiable lacks email property', () => {
    const notification = new WelcomeNotification()
    const invalidNotifiable = { getNotifiableId: () => '2' }

    expect(() => notification.toMail(invalidNotifiable)).toThrow(
      'Notifiable does not have an email property'
    )
  })
})
