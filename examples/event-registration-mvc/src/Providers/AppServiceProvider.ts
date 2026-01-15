import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'
import { NotificationService } from '../Services/NotificationService'
import { QrCodeService } from '../Services/QrCodeService'
import { RegistrationService } from '../Services/RegistrationService'

export class AppServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // Register services
    container.singleton('qrCodeService', () => new QrCodeService())

    container.singleton('notificationService', (c) => {
      const mail = c.make<any>('mail')
      return new NotificationService(mail)
    })

    container.singleton('registrationService', (c) => {
      const qrCodeService = c.make<QrCodeService>('qrCodeService')
      const notificationService = c.make<NotificationService>('notificationService')
      return new RegistrationService(qrCodeService, notificationService)
    })
  }

  boot(core: PlanetCore): void {
    // Services are ready
  }
}
