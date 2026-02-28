import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { ICategoryRepository } from '../../../../src/Domain/Contracts/ICatalogRepository'
import { CategoryManagementContext } from '../../../../src/Domain/DCI/Contexts/CategoryManagementContext'
import type { Category } from '../../../../src/Domain/Entities/Category'
import { I18nText } from '../../../../src/Domain/ValueObjects/I18nText'
import { Slug } from '../../../../src/Domain/ValueObjects/Slug'

class InMemoryCategoryRepository implements ICategoryRepository {
  private categories: Map<string, Category> = new Map()

  async save(category: Category): Promise<void> {
    this.categories.set(category.id, category)
  }

  async findById(id: string) {
    return this.categories.get(id) || null
  }

  async findBySlug() {
    return null
  }

  async findAll() {
    return Array.from(this.categories.values())
  }

  async findByParentId(parentId: string | null) {
    return Array.from(this.categories.values()).filter((c) => c.parentId === parentId)
  }

  async findByPathPrefix(path: string) {
    return Array.from(this.categories.values()).filter((c) => c.path?.startsWith(`${path}/`))
  }

  async delete(id: string): Promise<void> {
    this.categories.delete(id)
  }
}

describe('CategoryManagementContext', () => {
  let repo: ICategoryRepository
  let core: any

  beforeEach(() => {
    repo = new InMemoryCategoryRepository()
    core = {
      hooks: {
        doAction: async () => {},
      },
    } as unknown as PlanetCore
  })

  it('should create root category', async () => {
    const ctx = new CategoryManagementContext(repo, core)
    const category = await ctx.createCategory({
      name: { en: 'Electronics' },
      slug: 'electronics',
    })

    expect(category.id).toBeDefined()
    expect(category.name.getText('en')).toBe('Electronics')
    expect(category.path).toBe('electronics')
    expect(category.parentId).toBeNull()
  })

  it('should create child category with parent path', async () => {
    const ctx = new CategoryManagementContext(repo, core)
    const parent = await ctx.createCategory({
      name: { en: 'Electronics' },
      slug: 'electronics',
    })

    const child = await ctx.createCategory({
      name: { en: 'Phones' },
      slug: 'phones',
      parentId: parent.id,
    })

    expect(child.parentId).toBe(parent.id)
    expect(child.path).toBe('electronics/phones')
  })

  it('should update category info', async () => {
    const ctx = new CategoryManagementContext(repo, core)
    const category = await ctx.createCategory({
      name: { en: 'Old Name' },
      slug: 'category',
    })

    const updated = await ctx.updateCategory({
      id: category.id,
      name: { en: 'New Name' },
      description: 'New description',
    })

    expect(updated.name.getText('en')).toBe('New Name')
    expect(updated.description).toBe('New description')
  })

  it('should move category to new parent', async () => {
    const ctx = new CategoryManagementContext(repo, core)
    const parent1 = await ctx.createCategory({
      name: { en: 'Parent 1' },
      slug: 'parent1',
    })

    const parent2 = await ctx.createCategory({
      name: { en: 'Parent 2' },
      slug: 'parent2',
    })

    const child = await ctx.createCategory({
      name: { en: 'Child' },
      slug: 'child',
      parentId: parent1.id,
    })

    expect(child.path).toBe('parent1/child')

    const moved = await ctx.moveCategory({
      id: child.id,
      newParentId: parent2.id,
    })

    expect(moved.parentId).toBe(parent2.id)
    expect(moved.path).toBe('parent2/child')
  })

  it('should move category to root', async () => {
    const ctx = new CategoryManagementContext(repo, core)
    const parent = await ctx.createCategory({
      name: { en: 'Parent' },
      slug: 'parent',
    })

    const child = await ctx.createCategory({
      name: { en: 'Child' },
      slug: 'child',
      parentId: parent.id,
    })

    const moved = await ctx.moveCategory({
      id: child.id,
      newParentId: null,
    })

    expect(moved.parentId).toBeNull()
    expect(moved.path).toBe('child')
  })

  it('should sync descendant paths when moving', async () => {
    const ctx = new CategoryManagementContext(repo, core)
    const parent1 = await ctx.createCategory({
      name: { en: 'Parent 1' },
      slug: 'parent1',
    })

    const parent2 = await ctx.createCategory({
      name: { en: 'Parent 2' },
      slug: 'parent2',
    })

    const child = await ctx.createCategory({
      name: { en: 'Child' },
      slug: 'child',
      parentId: parent1.id,
    })

    const grandchild = await ctx.createCategory({
      name: { en: 'Grandchild' },
      slug: 'grandchild',
      parentId: child.id,
    })

    expect(grandchild.path).toBe('parent1/child/grandchild')

    await ctx.moveCategory({
      id: child.id,
      newParentId: parent2.id,
    })

    const updated = await repo.findById(grandchild.id)
    expect(updated!.path).toBe('parent2/child/grandchild')
  })

  it('should prevent circular reference', async () => {
    const ctx = new CategoryManagementContext(repo, core)
    const parent = await ctx.createCategory({
      name: { en: 'Parent' },
      slug: 'parent',
    })

    const child = await ctx.createCategory({
      name: { en: 'Child' },
      slug: 'child',
      parentId: parent.id,
    })

    try {
      await ctx.moveCategory({
        id: parent.id,
        newParentId: child.id,
      })
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('circular reference')
      }
    }
  })

  it('should throw error deleting non-existent category', async () => {
    const ctx = new CategoryManagementContext(repo, core)

    try {
      await ctx.deleteCategory('cat-999')
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('Category not found')
      }
    }
  })
})
