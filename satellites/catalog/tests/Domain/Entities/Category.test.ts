import { describe, expect, it } from 'bun:test'
import { Category } from '../../../src/Domain/Entities/Category'
import { I18nText } from '../../../src/Domain/ValueObjects/I18nText'
import { Slug } from '../../../src/Domain/ValueObjects/Slug'

describe('Category Entity', () => {
  it('should create root category without parent', () => {
    const name = I18nText.of({ en: 'Electronics' })
    const slug = Slug.of('electronics')
    const category = Category.create('cat-1', name, slug)
    expect(category.id).toBe('cat-1')
    expect(category.name.getText('en')).toBe('Electronics')
    expect(category.slug.value).toBe('electronics')
    expect(category.parentId).toBeNull()
  })

  it('should create child category with parent', () => {
    const name = I18nText.of({ en: 'Phones' })
    const slug = Slug.of('phones')
    const category = Category.create('cat-2', name, slug, 'cat-1')
    expect(category.parentId).toBe('cat-1')
  })

  it('should update category name', () => {
    const category = Category.create('cat-1', I18nText.of({ en: 'Old Name' }), Slug.of('old'))
    const newName = I18nText.of({ en: 'New Name' })
    category.updateName(newName)
    expect(category.name.getText('en')).toBe('New Name')
  })

  it('should update category description', () => {
    const category = Category.create('cat-1', I18nText.of({ en: 'Category' }), Slug.of('category'))
    category.updateDescription('New description')
    expect(category.description).toBe('New description')
  })

  it('should update sort order', () => {
    const category = Category.create('cat-1', I18nText.of({ en: 'Category' }), Slug.of('category'))
    expect(category.sortOrder).toBe(0)
    category.updateSortOrder(5)
    expect(category.sortOrder).toBe(5)
  })

  it('should compute path for root category', () => {
    const category = Category.create(
      'cat-1',
      I18nText.of({ en: 'Electronics' }),
      Slug.of('electronics')
    )
    category.updatePath(null)
    expect(category.path).toBe('electronics')
  })

  it('should compute path for child category', () => {
    const parent = Category.create(
      'cat-1',
      I18nText.of({ en: 'Electronics' }),
      Slug.of('electronics')
    )
    parent.updatePath(null)

    const child = Category.create(
      'cat-2',
      I18nText.of({ en: 'Phones' }),
      Slug.of('phones'),
      'cat-1'
    )
    child.updatePath(parent.path)
    expect(child.path).toBe('electronics/phones')
  })

  it('should compute nested path for grandchild category', () => {
    const root = Category.create(
      'cat-1',
      I18nText.of({ en: 'Electronics' }),
      Slug.of('electronics')
    )
    root.updatePath(null)

    const child = Category.create(
      'cat-2',
      I18nText.of({ en: 'Phones' }),
      Slug.of('phones'),
      'cat-1'
    )
    child.updatePath(root.path)

    const grandchild = Category.create(
      'cat-3',
      I18nText.of({ en: 'Smartphones' }),
      Slug.of('smartphones'),
      'cat-2'
    )
    grandchild.updatePath(child.path)
    expect(grandchild.path).toBe('electronics/phones/smartphones')
  })

  it('should compute child path prefix', () => {
    const category = Category.create(
      'cat-1',
      I18nText.of({ en: 'Electronics' }),
      Slug.of('electronics')
    )
    category.updatePath(null)
    expect(category.computeChildPathPrefix()).toBe('electronics')
  })

  it('should move category to new parent', () => {
    const category = Category.create(
      'cat-1',
      I18nText.of({ en: 'Category' }),
      Slug.of('category'),
      'parent-1'
    )
    expect(category.parentId).toBe('parent-1')
    category.moveTo('parent-2')
    expect(category.parentId).toBe('parent-2')
  })

  it('should move category to root', () => {
    const category = Category.create(
      'cat-1',
      I18nText.of({ en: 'Category' }),
      Slug.of('category'),
      'parent-1'
    )
    category.moveTo(null)
    expect(category.parentId).toBeNull()
  })

  it('should track createdAt and updatedAt', () => {
    const before = new Date()
    const category = Category.create('cat-1', I18nText.of({ en: 'Category' }), Slug.of('category'))
    const after = new Date()
    expect(category.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(category.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(category.createdAt.getTime())
  })

  it('should update updatedAt when properties change', () => {
    const category = Category.create('cat-1', I18nText.of({ en: 'Category' }), Slug.of('category'))
    const originalUpdatedAt = category.updatedAt.getTime()
    category.updateName(I18nText.of({ en: 'Updated' }))
    expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt)
  })

  it('should handle metadata', () => {
    const category = Category.reconstitute('cat-1', {
      parentId: null,
      path: 'category',
      name: I18nText.of({ en: 'Category' }),
      slug: Slug.of('category'),
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { custom_field: 'value' },
    })
    expect(category.metadata.custom_field).toBe('value')
  })

  it('should return empty metadata when not provided', () => {
    const category = Category.create('cat-1', I18nText.of({ en: 'Category' }), Slug.of('category'))
    expect(Object.keys(category.metadata).length).toBe(0)
  })
})
