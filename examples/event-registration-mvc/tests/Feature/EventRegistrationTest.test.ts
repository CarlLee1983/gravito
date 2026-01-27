import { describe, expect, it } from 'bun:test'
import { DB } from '@gravito/atlas'
import type { HashManager } from '@gravito/sentinel'
import { EventStatus } from '../../src/Models/Event'
import { RegistrationStatus } from '../../src/Models/Registration'
import { itHasTestCase, TestCase } from '../TestCase'

describe('Event Registration', () => {
  itHasTestCase((t) => {
    it('can view event details', async () => {
      const result = await DB.table('events').insert({
        title: 'Tech Conference 2024',
        description: 'The future of Gravito',
        location: 'Taipei',
        status: EventStatus.PUBLISHED,
        registration_start: new Date(),
        registration_end: new Date(Date.now() + 86400000),
      })
      const eventId = typeof result[0] === 'object' ? (result[0] as any).id : result[0]

      const response = await t.http().get(`/events/${eventId}`, {
        'X-Inertia': 'true',
        'X-Inertia-Version': '1.0.0',
      })
      response.assertStatus(200)
      const json = await response.getJson()
      expect(json.component).toBe('Events/Show')
      expect(json.props.event.title).toBe('Tech Conference 2024')
    })

    it('can register for an event session', async () => {
      const hashedPassword = await t.core.hasher.make('password')

      // 1. Setup: User, Event, Session, Custom Field
      const users = await DB.table('users').insert({
        name: 'Registrant',
        email: 'registrant@example.com',
        password: hashedPassword,
        role: 'user',
      })
      const userId = typeof users[0] === 'object' ? (users[0] as any).id : users[0]

      const events = await DB.table('events').insert({
        title: 'Registration Event',
        description: 'Register here',
        location: 'Office',
        status: EventStatus.PUBLISHED,
        registration_start: new Date('2020-01-01'),
        registration_end: new Date('2030-01-01'),
      })
      const eventId = typeof events[0] === 'object' ? (events[0] as any).id : events[0]

      const sessions = await DB.table('sessions').insert({
        event_id: eventId,
        title: 'Morning Session',
        start_time: new Date('2026-06-01 09:00:00'),
        end_time: new Date('2026-06-01 12:00:00'),
        capacity: 50,
      })
      const sessionId = typeof sessions[0] === 'object' ? (sessions[0] as any).id : sessions[0]

      const fields = await DB.table('registration_fields').insert({
        event_id: eventId,
        name: 'tshirt_size',
        label: 'T-Shirt Size',
        type: 'select',
        options: JSON.stringify(['S', 'M', 'L', 'XL']),
        required: true,
        sort_order: 1,
      })
      const fieldId = typeof fields[0] === 'object' ? (fields[0] as any).id : fields[0]

      // 2. Act: Login and Register
      const http = t.http()

      await http.post('/login', {
        email: 'registrant@example.com',
        password: 'password',
      })

      const response = await http.post('/registrations', {
        session_id: sessionId,
        field_values: {
          [fieldId as number]: 'L',
        },
        notes: 'Looking forward to it!',
      })

      // 3. Assert
      response.assertRedirect('/profile')

      const registration = await DB.table('registrations').where('user_id', userId).first()
      expect(registration).toBeDefined()
      if (!registration) throw new Error('Registration not found')

      expect(registration.session_id).toBe(sessionId)
      expect(registration.status).toBe(RegistrationStatus.CONFIRMED)

      const value = await DB.table('registration_values')
        .where('registration_id', registration.id)
        .where('field_id', fieldId)
        .first()
      expect(value).toBeDefined()
      if (!value) throw new Error('Registration value not found')
      expect(value.value).toBe('L')
    })
  })
})
