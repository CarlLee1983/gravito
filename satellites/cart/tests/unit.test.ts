import { beforeEach, describe, expect, it } from 'bun:test'
import { AddToCart } from '../src/Application/UseCases/AddToCart'
import { ClearCart } from '../src/Application/UseCases/ClearCart'
import { GetCart } from '../src/Application/UseCases/GetCart'
import { MergeCart } from '../src/Application/UseCases/MergeCart'
import { RemoveFromCart } from '../src/Application/UseCases/RemoveFromCart'
import { UpdateCartItem } from '../src/Application/UseCases/UpdateCartItem'
import type { ICartRepository } from '../src/Domain/Contracts/ICartRepository'
import type { Cart } from '../src/Domain/Entities/Cart'

/**
 * Mock Repository for testing UseCases
 */
class MockCartRepository implements ICartRepository {
  private carts: Map<string, Cart> = new Map()

  async find(id: { memberId?: string; guestId?: string }): Promise<Cart | null> {
    for (const cart of this.carts.values()) {
      if (id.memberId && cart.memberId === id.memberId) {
        return cart
      }
      if (id.guestId && cart.guestId === id.guestId) {
        return cart
      }
    }
    return null
  }

  async findById(id: string): Promise<Cart | null> {
    return this.carts.get(id) || null
  }

  async save(cart: Cart): Promise<void> {
    this.carts.set(cart.id, cart)
  }

  async delete(id: string): Promise<void> {
    this.carts.delete(id)
  }
}

describe('Cart UseCase Layer', () => {
  let repo: MockCartRepository

  beforeEach(() => {
    repo = new MockCartRepository()
  })

  describe('AddToCart', () => {
    it('應該能新增商品到購物車', async () => {
      const useCase = new AddToCart(repo)

      await useCase.execute({
        memberId: 'mem-1',
        variantId: 'var-1',
        quantity: 5,
      })

      const saved = await repo.find({ memberId: 'mem-1' })
      expect(saved).toBeDefined()
      expect(saved!.items.length).toBe(1)
      expect(saved!.items[0].variantId).toBe('var-1')
      expect(saved!.items[0].quantity).toBe(5)
    })

    it('應該累加相同變體的數量', async () => {
      const useCase = new AddToCart(repo)

      await useCase.execute({
        memberId: 'mem-1',
        variantId: 'var-1',
        quantity: 5,
      })

      await useCase.execute({
        memberId: 'mem-1',
        variantId: 'var-1',
        quantity: 3,
      })

      const saved = await repo.find({ memberId: 'mem-1' })
      expect(saved!.items.length).toBe(1)
      expect(saved!.items[0].quantity).toBe(8)
    })
  })

  describe('RemoveFromCart', () => {
    it('應該能移除商品', async () => {
      const addUseCase = new AddToCart(repo)
      const removeUseCase = new RemoveFromCart(repo)

      await addUseCase.execute({
        memberId: 'mem-1',
        variantId: 'var-1',
        quantity: 5,
      })

      await removeUseCase.execute({
        memberId: 'mem-1',
        variantId: 'var-1',
      })

      const saved = await repo.find({ memberId: 'mem-1' })
      expect(saved!.items.length).toBe(0)
    })

    it('移除不存在的購物車應該拋出錯誤', async () => {
      const removeUseCase = new RemoveFromCart(repo)

      try {
        await removeUseCase.execute({
          memberId: 'nonexistent',
          variantId: 'var-1',
        })
        expect(false).toBe(true) // 應該拋出錯誤
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('UpdateCartItem', () => {
    it('應該能更新商品數量', async () => {
      const addUseCase = new AddToCart(repo)
      const updateUseCase = new UpdateCartItem(repo)

      await addUseCase.execute({
        memberId: 'mem-1',
        variantId: 'var-1',
        quantity: 5,
      })

      await updateUseCase.execute({
        memberId: 'mem-1',
        variantId: 'var-1',
        quantity: 10,
      })

      const saved = await repo.find({ memberId: 'mem-1' })
      expect(saved!.items[0].quantity).toBe(10)
    })
  })

  describe('ClearCart', () => {
    it('應該能清空購物車', async () => {
      const addUseCase = new AddToCart(repo)
      const clearUseCase = new ClearCart(repo)

      await addUseCase.execute({
        memberId: 'mem-1',
        variantId: 'var-1',
        quantity: 5,
      })

      await addUseCase.execute({
        memberId: 'mem-1',
        variantId: 'var-2',
        quantity: 3,
      })

      await clearUseCase.execute({ memberId: 'mem-1' })

      const saved = await repo.find({ memberId: 'mem-1' })
      expect(saved!.items.length).toBe(0)
    })
  })

  describe('GetCart', () => {
    it('應該能查詢購物車', async () => {
      const addUseCase = new AddToCart(repo)
      const getUseCase = new GetCart(repo)

      await addUseCase.execute({
        memberId: 'mem-1',
        variantId: 'var-1',
        quantity: 5,
      })

      const cartDTO = await getUseCase.execute({ memberId: 'mem-1' })
      expect(cartDTO).toBeDefined()
      expect(cartDTO!.memberId).toBe('mem-1')
      expect(cartDTO!.items.length).toBe(1)
    })

    it('不存在的購物車應該回傳 null', async () => {
      const getUseCase = new GetCart(repo)
      const result = await getUseCase.execute({ memberId: 'nonexistent' })
      expect(result).toBeNull()
    })
  })

  describe('MergeCart', () => {
    it('應該能合併兩個購物車', async () => {
      const addUseCase = new AddToCart(repo)
      const mergeUseCase = new MergeCart(repo)

      // 建立訪客購物車
      await addUseCase.execute({
        guestId: 'guest-1',
        variantId: 'var-1',
        quantity: 5,
      })

      // 建立會員購物車
      await addUseCase.execute({
        memberId: 'mem-1',
        variantId: 'var-2',
        quantity: 3,
      })

      // 合併
      await mergeUseCase.execute({
        memberId: 'mem-1',
        guestId: 'guest-1',
      })

      const memberCart = await repo.find({ memberId: 'mem-1' })
      expect(memberCart!.items.length).toBe(2)

      const guestCart = await repo.find({ guestId: 'guest-1' })
      expect(guestCart).toBeNull()
    })

    it('無會員購物車時應該轉正訪客購物車', async () => {
      const addUseCase = new AddToCart(repo)
      const mergeUseCase = new MergeCart(repo)

      // 建立訪客購物車
      await addUseCase.execute({
        guestId: 'guest-1',
        variantId: 'var-1',
        quantity: 5,
      })

      // 合併（無會員購物車）
      await mergeUseCase.execute({
        memberId: 'mem-1',
        guestId: 'guest-1',
      })

      const memberCart = await repo.find({ memberId: 'mem-1' })
      expect(memberCart!.memberId).toBe('mem-1')
      expect(memberCart!.guestId).toBeNull()
      expect(memberCart!.items.length).toBe(1)
    })
  })
})
