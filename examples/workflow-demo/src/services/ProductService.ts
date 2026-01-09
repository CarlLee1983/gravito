import { randomUUID } from 'node:crypto'
import { DB } from '@gravito/atlas'

export type Product = {
  id: string
  name: string
  sku: string
  price: number
  inventory: number
  created_at?: string | null
  updated_at?: string | null
}

export class ProductService {
  private seeded = false
  private seeding: Promise<void> | null = null

  async list(): Promise<Product[]> {
    await this.ensureSeeded()
    return await DB.table<Product>('products').orderBy('created_at', 'desc').get()
  }

  async create(payload: Omit<Product, 'id'>): Promise<Product> {
    await this.ensureSeeded()
    const [product] = await DB.table<Product>('products').insert({
      id: randomUUID(),
      ...payload,
    })
    return product
  }

  async update(id: string, payload: Partial<Omit<Product, 'id'>>): Promise<Product | null> {
    await this.ensureSeeded()
    const changes = { ...payload }
    const updated = await DB.table('products').where('id', id).update(changes)
    if (!updated) {
      return null
    }
    return await this.find(id)
  }

  async delete(id: string): Promise<boolean> {
    const result = await DB.table('products').where('id', id).delete()
    return result > 0
  }

  async find(id: string): Promise<Product | null> {
    return await DB.table<Product>('products').where('id', id).first()
  }

  private async ensureSeeded() {
    if (this.seeded) {
      return
    }
    if (!this.seeding) {
      this.seeding = (async () => {
        const count = await DB.table('products').count()
        if (count === 0) {
          const seedItems: Omit<Product, 'id'>[] = [
            { name: 'Stellar Chair', sku: 'STL-CHAIR', price: 149.99, inventory: 12 },
            { name: 'Orbit Desk', sku: 'ORT-DESK', price: 349.0, inventory: 5 },
          ]
          await DB.table('products').insert(
            seedItems.map((item) => ({ id: randomUUID(), ...item }))
          )
        }
        this.seeded = true
      })()
    }
    await this.seeding
  }
}
