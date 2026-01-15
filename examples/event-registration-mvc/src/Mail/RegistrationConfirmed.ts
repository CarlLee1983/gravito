import { Mailable } from '@gravito/signal'
import type { Registration } from '../Models/Registration'

export class RegistrationConfirmed extends Mailable {
  constructor(private registration: Registration) {
    super()
  }

  build() {
    return this.to(this.registration.user?.email || '')
      .subject('Registration Confirmed')
      .html(this.getHtmlContent())
  }

  private getHtmlContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Confirmed!</h1>
          </div>
          <div class="content">
            <p>Dear ${this.registration.user?.name},</p>
            <p>Your registration has been confirmed for:</p>
            
            <div class="info-box">
              <h2>${this.registration.session?.event?.title}</h2>
              <p><strong>Session:</strong> ${this.registration.session?.title}</p>
              <p><strong>Date & Time:</strong> ${new Date(this.registration.session?.start_time || '').toLocaleString()}</p>
              <p><strong>Location:</strong> ${this.registration.session?.event?.location}</p>
              <p><strong>Registration ID:</strong> ${this.registration.id}</p>
              <p><strong>QR Code:</strong> ${this.registration.qr_code}</p>
            </div>
            
            <p>Please save your QR code for check-in at the event. You can view and download it from your profile.</p>
            
            <p style="text-align: center;">
              <a href="${process.env.APP_URL}/profile/registrations/${this.registration.id}" class="button">
                View Registration & QR Code
              </a>
            </p>
            
            <p>We look forward to seeing you at the event!</p>
            
            <div class="footer">
              <p>Event Registration System</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
}
