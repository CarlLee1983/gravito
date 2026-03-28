import { FortifyError } from '../../errors/FortifyError'
import { ErrorCodes } from '../../errors/codes'
import { AbstractProvider } from './AbstractProvider'
import type { OAuthUser } from './types'

export class GoogleProvider extends AbstractProvider {
  protected getScopes(scopes?: string[]): string[] {
    const defaultScopes = ['openid', 'profile', 'email']
    return scopes || this.config.scopes || defaultScopes
  }

  getAuthorizationUrl(state: string, scopes?: string[]): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.getScopes(scopes).join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  async getUser(code: string): Promise<OAuthUser> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new FortifyError(
        ErrorCodes.OAUTH_AUTHENTICATION_FAILED,
        401,
        { message: `Failed to exchange token: ${await tokenResponse.text()}` }
      )
    }

    const tokens = await tokenResponse.json()

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userResponse.ok) {
      throw new FortifyError(
        ErrorCodes.OAUTH_AUTHENTICATION_FAILED,
        401,
        { message: `Failed to fetch user info: ${await userResponse.text()}` }
      )
    }

    const user = await userResponse.json()

    return {
      id: user.sub,
      name: user.name,
      email: user.email,
      avatar: user.picture,
      raw: user,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    }
  }
}
