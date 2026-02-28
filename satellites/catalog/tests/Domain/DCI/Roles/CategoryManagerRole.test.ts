import { describe, expect, it } from 'bun:test'
import { injectCategoryManager } from '../../../../src/Domain/DCI/Roles/CategoryManagerRole'
import { Category } from '../../../../src/Domain/Entities/Category'
import { I18nText } from '../../../../src/Domain/ValueObjects/I18nText'
import { Slug } from '../../../../src/Domain/ValueObjects/Slug'

describe('CategoryManagerRole', () => {
  const createCategory = (id = 'cat-1'): Category => {
    return Category.create(
      id,
      I18nText.of({ en: 'Category', 'zh-TW': '分類' }),
      Slug.of('category')
    )
  }

  it('should update category name', () => {
    const category = createCategory()
    const manager = injectCategoryManager(category)

    const newName = I18nText.of({ en: 'New Name' })
    manager.updateInfo({ name: newName })

    expect(category.name.getText('en')).toBe('New Name')
  })

  it('should update category description', () => {
    const category = createCategory()
    const manager = injectCategoryManager(category)

    manager.updateInfo({ description: 'New description' })

    expect(category.description).toBe('New description')
  })

  it('should update sort order', () => {
    const category = createCategory()
    const manager = injectCategoryManager(category)

    manager.updateInfo({ sortOrder: 5 })

    expect(category.sortOrder).toBe(5)
  })

  it('should update multiple fields at once', () => {
    const category = createCategory()
    const manager = injectCategoryManager(category)

    manager.updateInfo({
      name: I18nText.of({ en: 'New Name' }),
      description: 'New description',
      sortOrder: 3,
    })

    expect(category.name.getText('en')).toBe('New Name')
    expect(category.description).toBe('New description')
    expect(category.sortOrder).toBe(3)
  })

  it('should move category to new parent', () => {
    const category = createCategory()
    expect(category.parentId).toBeNull()

    const manager = injectCategoryManager(category)
    manager.moveToParent('new-parent', 'parent-path')

    expect(category.parentId).toBe('new-parent')
    expect(category.path).toBe('parent-path/category')
  })

  it('should move category to root', () => {
    const category = Category.create(
      'cat-1',
      I18nText.of({ en: 'Category' }),
      Slug.of('category'),
      'parent-1'
    )
    category.updatePath('parent-path')

    const manager = injectCategoryManager(category)
    manager.moveToParent(null, null)

    expect(category.parentId).toBeNull()
    expect(category.path).toBe('category')
  })

  it('should compute and set path for root category', () => {
    const category = createCategory()
    const manager = injectCategoryManager(category)

    manager.computeAndSetPath(null)

    expect(category.path).toBe('category')
  })

  it('should compute and set path for child category', () => {
    const category = createCategory()
    const manager = injectCategoryManager(category)

    manager.computeAndSetPath('parent-path')

    expect(category.path).toBe('parent-path/category')
  })

  it('should handle nested path computation', () => {
    const category = createCategory()
    const manager = injectCategoryManager(category)

    manager.computeAndSetPath('electronics/phones')

    expect(category.path).toBe('electronics/phones/category')
  })
})
