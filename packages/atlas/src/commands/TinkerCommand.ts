import * as readline from 'node:readline'
import * as Atlas from '../index'
import { Command } from './Command'

export class TinkerCommand extends Command {
  signature = 'tinker'
  description = 'Interactive shell to experiment with your database'

  async handle(_args: Record<string, unknown>): Promise<void> {
    console.log('🌌 Orbit Tinker - Interactive Database Shell')
    console.log('Type "exit" to quit. All @gravito/atlas exports are pre-loaded.\n')

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'atlas> ',
    })

    rl.prompt()

    for await (const line of rl) {
      const input = line.trim()
      if (input === 'exit' || input === 'quit') {
        break
      }

      try {
        // Create context with pre-loaded modules
        const _context = { ...Atlas, console }

        // Wrap in async function to support await
        const script = `(async () => { return (${input}) })()`

        // Use Function instead of eval for slightly better isolation
        const result = await new Function('Atlas', `return ${script}`)(Atlas)

        if (result !== undefined) {
          console.log(result)
        }
      } catch (e: unknown) {
        const error = e as Error
        console.error('Error:', error.message)
      }
      rl.prompt()
    }

    rl.close()
  }
}
