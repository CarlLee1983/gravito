# Localization Strategy Guide

In a distributed **Galaxy Architecture**, maintaining consistent translations across isolated Satellites is a challenge. `@gravito/cosmos` provides the infrastructure to manage globalization at scale.

## 1. Request-Scoped Locales

Cosmos automatically detects and sets the current locale for every incoming request. This state is maintained throughout the request lifecycle.

```typescript
// The 'i18n' instance in context is pre-configured for the current user
app.get('/welcome', (c) => {
  const t = c.get('i18n').t;
  return c.text(t('messages.welcome'));
});
```

## 2. Distributed Translation Files

Instead of one giant translation file, each **Satellite** should manage its own linguistic assets.

```
satellites/catalog/
└── lang/
    ├── en.json
    └── zh-TW.json
```

Register satellite-specific translations during the `BOOT` phase:

```typescript
// CatalogSatellite.ts
async boot(core: PlanetCore) {
  const cosmos = core.container.resolve('cosmos');
  cosmos.addTranslations('catalog', path.join(__dirname, '../lang'));
}
```

## 3. Translation Namespacing

To avoid collisions between Satellites, use namespaces when resolving keys.

```typescript
// Explicit namespace
t('catalog::products.not_found');

// Fallback to global if namespace not found
t('common::errors.validation_failed');
```

## 4. Parameter Replacement & Pluralization

Cosmos follows the standard `:param` syntax for replacements and leverages `Intl.PluralRules` for complex pluralization logic.

```json
{
  "items_count": "Found :count {zero: items|one: item|other: items}"
}
```

```typescript
t('items_count', { count: 5 }); // Found 5 items
```

## 5. Dynamic Fallback Chains

Configure fallback languages based on regional requirements.

```typescript
new OrbitCosmos({
  fallback: {
    fallbackChain: {
      'zh-HK': ['zh-TW', 'en'],
      'fr-CA': ['fr', 'en']
    }
  }
})
```

## 6. Integration with Signal (Mail)

When sending emails via `@gravito/signal`, the `Mailable` class automatically uses the current locale context provided by Cosmos.

```typescript
export class WelcomeEmail extends Mailable {
  build() {
    return this.subject(this.t('emails.welcome_subject'));
  }
}
```
