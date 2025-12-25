# Eloquent: Serialization

When building APIs with Atlas, you will often need to convert your models to arrays or JSON. Atlas includes convenient methods for making these conversions, as well as controlling which attributes are included in your serializations.

## Serializing Models & Collections

### Serializing To JSON

To convert a model to JSON, you should use the `toJSON` method. 

```typescript
const user = await User.find(1);
return user.toJSON();
```

If you have a collection (array) of models, calling `toJSON` is not strictly necessary if you are returning it from a Hono/Gravito route, as the framework will automatically call `toJSON` on each model.

## Hiding Attributes From JSON

Sometimes you may wish to limit the attributes, such as passwords, that are included in your model's array or JSON representation. To do so, add a `hidden` property to your model:

```typescript
class User extends Model {
  // These attributes will be omitted from JSON output
  static override hidden = ['password', 'remember_token'];
}
```

## Adding Values To JSON

Occasionally, you may need to add array attributes that do not have a corresponding column in your database. To do so, first define an accessor (getter) for the value:

```typescript
class User extends Model {
  get is_admin() {
    return this.role === 'admin';
  }

  // Include this getter in the serialized output
  static override appends = ['is_admin'];
}
```

Once the attribute has been added to the `appends` list, it will be included in both the model's array and JSON representations.
