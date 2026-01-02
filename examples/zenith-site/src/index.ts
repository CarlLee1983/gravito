import { bootstrap } from './bootstrap'

async function main() {
  const core = await bootstrap({
    port: Number(process.env.PORT) || 3000,
    name: process.env.APP_NAME || 'Gravito Static Site',
    version: process.env.APP_VERSION || '1.0.0',
  })

  // For static site, we typically don't start the server
  // But we can start it for development/testing
  if (process.env.NODE_ENV !== 'production') {
    await core.liftoff()
  }
}

main().catch(console.error)
