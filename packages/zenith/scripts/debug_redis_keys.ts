import { Redis } from 'ioredis'

const redis = new Redis('redis://localhost:6379')

async function check() {
  console.log('Connecting to Redis...')
  try {
    const keys = await redis.keys('gravito:quasar:node:*')
    console.log('Keys found count:', keys.length)
    console.log('Keys:', keys)

    if (keys.length > 0) {
      const val = await redis.get(keys[0])
      console.log('--- Value of first key ---')
      console.log(val)
      console.log('--- End Value ---')
    }
  } catch (err) {
    console.error('Redis Error:', err)
  }
  process.exit(0)
}

check()
