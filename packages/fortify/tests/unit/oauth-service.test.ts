import { describe, expect, mock, test } from 'bun:test'
import { GitHubProvider } from '../../src/services/OAuth/GitHubProvider'
import { GoogleProvider } from '../../src/services/OAuth/GoogleProvider'
import { OAuthService } from '../../src/services/OAuthService'

describe('OAuthService', () => {
  test('registers and retrieves providers', () => {
    const service = new OAuthService()
    const provider = {
      getAuthorizationUrl: mock(),
      getUser: mock(),
    }

    service.register('google', provider)

    expect(service.getProvider('google')).toBe(provider)
    expect(service.hasProvider('google')).toBe(true)
  })

  test('throws for unknown provider', () => {
    const service = new OAuthService()
    expect(() => service.getProvider('unknown')).toThrow()
  })
})

describe('GoogleProvider', () => {
  const config = {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'https://app.com/callback',
  }

  test('generates authorization url', () => {
    const provider = new GoogleProvider(config)
    const url = provider.getAuthorizationUrl('state-123')

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url).toContain('client_id=client-id')
    expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.com%2Fcallback')
    expect(url).toContain('state=state-123')
    expect(url).toContain('scope=openid+profile+email')
  })

  test('getUser exchanges code for user', async () => {
    const provider = new GoogleProvider(config)

    const mockFetch = mock()
    global.fetch = mockFetch as any

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: '123',
          name: 'Test User',
          email: 'test@example.com',
          picture: 'avatar.jpg',
        }),
      } as any)

    const user = await provider.getUser('code-123')

    expect(user.id).toBe('123')
    expect(user.name).toBe('Test User')
    expect(user.email).toBe('test@example.com')
    expect(user.accessToken).toBe('access-token')
  })
})

describe('GitHubProvider', () => {
  const config = {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'https://app.com/callback',
  }

  test('generates authorization url', () => {
    const provider = new GitHubProvider(config)
    const url = provider.getAuthorizationUrl('state-123')

    expect(url).toContain('https://github.com/login/oauth/authorize')
    expect(url).toContain('client_id=client-id')
    expect(url).toContain('state=state-123')
  })
})
