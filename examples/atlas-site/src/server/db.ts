import { DB } from '@gravito/atlas'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(__dirname, '../../.atlas/database.sqlite')

// Ensure directory exists
import fs from 'fs'
const dir = path.dirname(dbPath)
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
}

DB.configure({
    default: 'sqlite',
    connections: {
        sqlite: {
            driver: 'sqlite',
            database: dbPath,
        }
    }
})

export { DB }
