import { FortifyError } from '../../errors/FortifyError'
import { ErrorCodes } from '../../errors/codes'
import { AbstractProvider } from './AbstractProvider'
import type { OAuthUser } from './types'

export class GitHubProvider extends AbstractProvider {
  protected getScopes(scopes?: string[]): string[] {
    const defaultScopes = ['read:user', 'user:email']
    return scopes || this.config.scopes || defaultScopes
  }

  getAuthorizationUrl(state: string, scopes?: string[]): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.getScopes(scopes).join(' '),
      state,
    })

    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  async getUser(code: string): Promise<OAuthUser> {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
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

    if (tokens.error) {
      throw new FortifyError(
        ErrorCodes.OAUTH_AUTHENTICATION_FAILED,
        401,
        { message: `GitHub OAuth error: ${tokens.error_description || tokens.error}` }
      )
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/json',
      },
    })

    if (!userResponse.ok) {
      throw new FortifyError(
        ErrorCodes.OAUTH_AUTHENTICATION_FAILED,
        401,
        { message: `Failed to fetch user info: ${await userResponse.text()}` }
      )
    }

    const user = await userResponse.json()
    let email = user.email

    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/json',
        },
      })

      if (emailResponse.ok) {
        const emails = await emailResponse.json()
        const primary = emails.find((e: any) => e.primary && e.verified)
        if (primary) {
          email = primary.email
        }
      }
    }

    return {
      id: String(user.id),
      name: user.name || user.login,
      email: email,
      avatar: user.avatar_url,
      raw: user,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    }
  }
}
