import { Get, Module } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { QuasarModule, type QuasarService } from './quasar.module'

@Module({
  imports: [QuasarModule],
})
class AppModule {
  @Get('/status')
  getStatus(quasar: QuasarService) {
    return quasar.agent.getStatus()
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
}
bootstrap()
