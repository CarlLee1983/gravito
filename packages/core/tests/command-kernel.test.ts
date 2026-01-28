import { describe, expect, it, mock } from 'bun:test'
import { CommandKernel } from '../src/CommandKernel'
import { Container } from '../src/Container'

describe('CommandKernel', () => {
  it('should register and execute commands', async () => {
    const container = new Container()
    container.instance('test', { value: 'service' })

    const kernel = new CommandKernel(container)
    const handler = mock(async (args: string[], c: Container) => {
      expect(args).toEqual(['arg1', 'arg2'])
      expect(c.make('test')).toEqual({ value: 'service' })
    })

    kernel.register('test:cmd', handler)

    await kernel.handle(['test:cmd', 'arg1', 'arg2'])

    expect(handler).toHaveBeenCalled()
  })

  it('should throw error if command not found', async () => {
    const container = new Container()
    const kernel = new CommandKernel(container)

    expect(kernel.handle(['missing'])).rejects.toThrow("Command 'missing' not found")
  })

  it('should throw error if no command provided', async () => {
    const container = new Container()
    const kernel = new CommandKernel(container)

    expect(kernel.handle([])).rejects.toThrow('No command name provided')
  })
})
