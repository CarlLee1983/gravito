import { randomBytes } from 'crypto'
import QRCode from 'qrcode'

export class QrCodeService {
  /**
   * Generate a unique QR code string
   */
  generateQrCodeString(): string {
    return randomBytes(16).toString('hex')
  }

  /**
   * Generate QR code as data URL
   */
  async generateQrCodeDataUrl(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1,
      })
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`)
    }
  }

  /**
   * Generate QR code as buffer
   */
  async generateQrCodeBuffer(data: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(data, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 300,
        margin: 1,
      })
    } catch (error) {
      throw new Error(`Failed to generate QR code buffer: ${error}`)
    }
  }
}
