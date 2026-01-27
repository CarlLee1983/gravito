import { Module } from '@nestjs/common'
import { QuasarModule } from './quasar.module'

@Module({
  imports: [QuasarModule],
})
export class AppModule {}
