import { defineConfig, PhotonAdapter, PlanetCore } from '@gravito/core'
import { bootstrapDatabase } from './bootstrap'

const core = new PlanetCore(
  defineConfig({
    adapter: new PhotonAdapter(),
  })
)

const port = parseInt(process.env.PORT || '3000')

;(async () => {
  await bootstrapDatabase(core)
  console.log(`🏦 CQRS 銀行應用已啟動: http://localhost:${port}`)
})()

export default core.liftoff(port)
