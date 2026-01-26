import { describe, expect, it } from 'bun:test'
import { I18nManager } from '../../src/I18nService'

describe('Pluralization', () => {
  it('handles plural forms correctly', () => {
    const translations = {
      en: {
        items: {
          zero: 'No items',
          one: '1 item',
          other: ':count items',
        },
        apples: {
          one: 'an apple',
          other: ':count apples',
        },
      },
      fr: {
        // French treats 0 and 1 as singular (usually)
        items: {
          one: 'un élément', // used for 0 and 1 in standard FR rule? Wait.
          other: ':count éléments',
        },
      },
    }

    const manager = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en', 'fr'],
      translations,
    })

    // English
    expect(manager.translate('en', 'items', { count: 0 })).toBe('No items') // explicit zero
    expect(manager.translate('en', 'items', { count: 1 })).toBe('1 item')
    expect(manager.translate('en', 'items', { count: 2 })).toBe('2 items')
    expect(manager.translate('en', 'items', { count: 10 })).toBe('10 items')

    // Missing zero key uses 'other' or 'one' based on rules?
    // English rules: one (n=1), other (n!=1). 0 falls to other.
    expect(manager.translate('en', 'apples', { count: 0 })).toBe('0 apples')
    expect(manager.translate('en', 'apples', { count: 1 })).toBe('an apple')

    // French
    // French rules: one (n>=0 && n<2), other (everything else)
    // So 0 is one. 1 is one. 2 is other.
    // Wait, let's verify node/bun Intl behavior.

    // In our code, we check 'zero' key FIRST if count === 0.
    // But 'fr' translations above don't have 'zero' key.
    // So it should fall to `pluralMap[form]`.
    // For fr, 0 -> 'one'.

    expect(manager.translate('fr', 'items', { count: 0 })).toBe('un élément')
    expect(manager.translate('fr', 'items', { count: 1 })).toBe('un élément')
    expect(manager.translate('fr', 'items', { count: 2 })).toBe('2 éléments')
  })
})
