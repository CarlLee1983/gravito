/**
 * @fileoverview Password reset mail template
 * @module @gravito/fortify
 */

import { Mailable } from '@gravito/signal'

/**
 * Password reset mail
 *
 * Sends an email with a password reset link to the user.
 */
export class ResetPasswordMail extends Mailable {
  constructor(
    private user: { email: string; name?: string },
    private resetUrl: string,
    private expirationMinutes = 60
  ) {
    super()
  }

  build() {
    const userName = this.user.name ?? 'there'

    return this.to(this.user.email)
      .subject('Reset Your Password')
      .html(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
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
              background: #dc3545;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .button:hover {
              background: #c82333;
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
              color: #dc3545;
              text-decoration: none;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 6px;
              padding: 12px;
              margin: 20px 0;
              color: #856404;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Password Reset Request</h1>

            <p>Hello ${this.escapeHtml(userName)},</p>

            <p>You are receiving this email because we received a password reset request for your account.</p>

            <a href="${this.escapeHtml(this.resetUrl)}" class="button">Reset Password</a>

            <p>Or copy and paste this URL into your browser:</p>
            <p><a href="${this.escapeHtml(this.resetUrl)}" class="link">${this.escapeHtml(this.resetUrl)}</a></p>

            <div class="warning">
              <strong>Security Notice:</strong> This password reset link will expire in ${this.expirationMinutes} minutes.
            </div>

            <div class="footer">
              <p>If you did not request a password reset, no further action is required. Your password will remain unchanged.</p>
              <p>If you're having trouble with the button above, you can copy and paste the URL into your browser.</p>
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
