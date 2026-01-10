import { DB } from '@gravito/atlas'
import { Model } from '@gravito/atlas/orm'
import { Gravito } from '@gravito/core/engine'

// 1. Initialize DB manually (Standalone Mode)
// In a full app, Gravito Application does this. Here we do it manually.
DB.configure({
  default: 'main',
  connections: {
    main: {
      driver: 'sqlite',
      database: ':memory:', // In-memory for speed/demo
    },
  },
})

// 2. Define Schema & Model
await DB.raw(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Seed some data
await DB.table('users').insert([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Charlie', email: 'charlie@example.com' },
])

interface User {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
}

// 3. Initialize Standalone Engine
const app = new Gravito()

// 4. Define Routes

// Fast Path: Hello World (Pure Engine Performance)
app.get('/', (c) => c.text('Gravito Engine + Atlas Microservice'))

// High Performance DB Query (Query Builder)
// This keeps overhead minimal by skipping full ORM hydration if not needed
app.get('/users', async (c) => {
  const users = await DB.table<User>('users').get()
  return c.json(users)
})

// Specific Record
app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await DB.table<User>('users').find(id)

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json(user)
})

// Create User (POST)
app.post('/users', async (c) => {
  const body = await c.req.json<{ name: string; email: string }>()

  try {
    const [user] = await DB.table<User>('users').insert({
      name: body.name,
      email: body.email,
    })
    return c.json(user, 201)
  } catch (e) {
    return c.json({ error: 'Failed to create user' }, 400)
  }
})

// 5. Start Server
console.log('🚀 Microservice running on http://localhost:3000')

export default app
