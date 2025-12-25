# Eloquent: Mutators & Casting

Mutators and attribute casting allow you to transform Eloquent attribute values when you retrieve or set them on model instances.

## Attribute Casting

Attribute casting provides functionality similar to mutators without requiring you to define any additional methods. Instead, your model's `_casts` property should define how properties should be cast.

### Supported Cast Types

The supported cast types are: `integer`, `float`, `string`, `boolean`, `object`, `array`, `date`, `datetime`, and `decimal`.

```typescript
import { Model, column } from '@gravito/atlas';

class User extends Model {
  @column()
  declare options: Record<string, any>;

  @column()
  declare is_admin: boolean;

  // Define casts
  static override _casts = {
    options: 'json',
    is_admin: 'boolean',
    created_at: 'datetime'
  };
}
```

### Array & JSON Casting

The `json` cast is particularly useful for working with columns that are stored as serialized JSON. 

```typescript
const user = await User.find(1);

// 'options' is automatically an object, not a string
if (user.options.is_pro) {
    // ...
}
```

## Date Casting

By default, Atlas handles `created_at` and `updated_at` as Date objects. You can also define other columns to be treated as dates:

```typescript
static override _casts = {
  published_at: 'date',
};
```

When setting a value on a date-cast attribute, Atlas will attempt to parse the value into a proper Date object.

## Custom Accessors

While Atlas doesn't use the `get{Attribute}Attribute` syntax of Laravel, you can simply use standard TypeScript getters to create "virtual" attributes:

```typescript
class User extends Model {
  @column()
  declare first_name: string;

  @column()
  declare last_name: string;

  // Virtual property
  get full_name() {
    return `${this.first_name} ${this.last_name}`;
  }
}
```
