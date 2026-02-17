import type { Container } from '@gravito/core'
import type { Command, CommandHandler } from '@gravito/enterprise'

export class CommandBus {
  constructor(private container: Container) {}

  async dispatch<TResult = void>(command: Command): Promise<TResult> {
    const handlerKey = `cqrs.command.${command.constructor.name}`
    const handler = this.container.make<CommandHandler<Command, TResult>>(handlerKey)
    return handler.handle(command)
  }
}
