import { describe, expect, it } from 'bun:test'
import { CallbackSocialUserProvider } from '../src/providers/CallbackSocialUserProvider'

describe('CallbackSocialUserProvider', () => {
  it('implements SocialUserProvider interface', async () => {
    const provider = new CallbackSocialUserProvider(
      async (id) => ({ id, getAuthIdentifier: () => id }),
      async (_user, _creds) => true,
      async (provider, socialId) => {
        if (provider === 'google' && socialId === '123') {
          return { id: 'user-1', getAuthIdentifier: () => 'user-1' } as any
        }
        return null
      },
      async (provider, profile) => {
        return {
          id: 'new-user',
          getAuthIdentifier: () => 'new-user',
          provider,
          profileId: profile.id,
        } as any
      }
    )

    // Test retrieveBySocialId
    const socialUser = await provider.retrieveBySocialId('google', '123')
    expect(socialUser?.getAuthIdentifier()).toBe('user-1')

    const unknownUser = await provider.retrieveBySocialId('github', '456')
    expect(unknownUser).toBeNull()

    // Test mapUserFromSocialProfile
    const profile = {
      id: 'soc-1',
      name: 'Test User',
      raw: {},
    }
    const mappedUser = (await provider.mapUserFromSocialProfile('facebook', profile)) as any
    expect(mappedUser.getAuthIdentifier()).toBe('new-user')
    expect(mappedUser.provider).toBe('facebook')
    expect(mappedUser.profileId).toBe('soc-1')
  })

  it('inherits standard UserProvider methods', async () => {
    const provider = new CallbackSocialUserProvider(
      async (id) => ({ id, getAuthIdentifier: () => id }),
      async (_user, creds) => creds.password === 'secret',
      async () => null,
      async () => ({}) as any
    )

    // Test inherited retrieveById
    const user = await provider.retrieveById('1')
    expect(user?.getAuthIdentifier()).toBe('1')

    // Test inherited validateCredentials
    const valid = await provider.validateCredentials(user as any, { password: 'secret' })
    expect(valid).toBe(true)
  })
})
