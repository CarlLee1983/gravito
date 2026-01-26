import { QuasarAgent } from '@gravito/quasar'
import { Global, Injectable, Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'

@Injectable()
export class QuasarService implements OnModuleInit, OnModuleDestroy {
  public readonly agent: QuasarAgent

  constructor() {
    this.agent = new QuasarAgent({
      service: 'nestjs-app',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    })
  }

  async onModuleInit() {
    await this.agent.start()
  }

  async onModuleDestroy() {
    await this.agent.stop()
  }
}

@Global()
@Module({
  providers: [QuasarService],
  exports: [QuasarService],
})
export class QuasarModule {}
