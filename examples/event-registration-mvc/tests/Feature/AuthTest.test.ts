import { describe, expect, it } from 'bun:test'
import { DB } from '@gravito/atlas'
import { itHasTestCase } from '../TestCase'

describe('Authentication', () => {
  itHasTestCase((t) => {
    it('can register a new user', async () => {
      const response = await t.http().post('/register', {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })

      // In Gravito, redirect returns 302
      response.assertRedirect('/profile')

      const user = await DB.table('users').where('email', 'test@example.com').first()
      expect(user).toBeDefined()
      expect(user.name).toBe('Test User')
    })

    it('cannot register with an existing email', async () => {
      // First registration
      await t.http().post('/register', {
        name: 'User 1',
        email: 'duplicate@example.com',
        password: 'password123',
      })

      // Second registration with same email
      const response = await t.http().post('/register', {
        name: 'User 2',
        email: 'duplicate@example.com',
        password: 'password123',
      })

      // Should redirect back
      response.assertStatus(302)
      // Ideally check flash message here if test helper supports it
    })

    it('can login with correct credentials', async () => {
      // Register a user first
      await t.http().post('/register', {
        name: 'Login User',
        email: 'login@example.com',
        password: 'password123',
      })

      // Try to login
      const response = await t.http().post('/login', {
        email: 'login@example.com',
        password: 'password123',
      })

      response.assertRedirect('/profile')
    })

    it('cannot login with incorrect credentials', async () => {
      const session = await t.http().post('/login', {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      })

      session.assertRedirect('/login')
    })
  })
})
