/**
 * @fileoverview Email verification mail template
 * @module @gravito/fortify
 */

import { Mailable } from '@gravito/signal'

/**
 * Email verification mail
 *
 * Sends an email with a verification link to the user.
 */
export class VerifyEmailMail extends Mailable {
  constructor(
    private user: { email: string; name?: string },
    private verificationUrl: string
  ) {
    super()
  }

  async build() {
    const userName = this.user.name ?? 'there'

    return this.to(this.user.email)
      .subject('Verify Your Email Address')
      .html(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              padding: 40px;
              margin: 20px 0;
            }
            h1 {
              color: #1a1a1a;
              margin-bottom: 20px;
              font-size: 24px;
            }
            p {
              margin-bottom: 16px;
              color: #555;
            }
            .button {
              display: inline-block;
              padding: 12px 32px;
              background: #007bff;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .button:hover {
              background: #0056b3;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 14px;
              color: #777;
            }
            .link {
              word-break: break-all;
              color: #007bff;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Hello ${this.escapeHtml(userName)}!</h1>

            <p>Thank you for registering with us. Please verify your email address by clicking the button below:</p>

            <a href="${this.escapeHtml(this.verificationUrl)}" class="button">Verify Email Address</a>

            <p>Or copy and paste this URL into your browser:</p>
            <p><a href="${this.escapeHtml(this.verificationUrl)}" class="link">${this.escapeHtml(this.verificationUrl)}</a></p>

            <div class="footer">
              <p>If you did not create an account, no further action is required.</p>
              <p>This link will expire in 24 hours for security reasons.</p>
            </div>
          </div>
        </body>
        </html>
      `)
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return text.replace(/[&<>"']/g, (m) => map[m])
  }
}
