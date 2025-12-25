# Atlas ORM Quick Start

Atlas ORM is an implementation of the ActiveRecord pattern, making database interactions intuitive and elegant. Each database table has a corresponding "Model" that is used to interact with that table.

## Defining Models

All models extend the `Model` class. You can use decorators to define columns and relationships.

```typescript
import { Model, column } from '@gravito/atlas';

export class User extends Model {
  // The table associated with the model (defaults to snake_case plural, e.g., users)
  static table = 'users';

  // The primary key (defaults to id)
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare name: string;

  @column()
  declare email: string;
}
```

### Model Conventions

Atlas follows the "Convention over Configuration" principle:

*   **Table Names**: By default, the model assumes the table name is the plural, snake_case version of the class name. For example, `BlogPost` corresponds to `blog_posts`. You can override this via the `static table` property.
*   **Primary Keys**: It assumes each table has a primary key column named `id`. You can define `static primaryKey` to override this.
*   **Timestamps**: By default, `created_at` and `updated_at` are automatically managed. To disable this, set `static timestamps = false`.
*   **Database Connection**: Uses the `default` connection. To specify a different one, set `static connection`.

```typescript
class Flight extends Model {
  // Specify table
  static table = 'my_flights';
  
  // Specify primary key
  static primaryKey = 'flight_id';
  
  // Specify connection
  static connection = 'mysql';

  // Disable timestamps
  static timestamps = false;
}
```

### Default Attribute Values

You can define default values directly on the model class properties, or use the `autoCreate` option in `@column`.

```typescript
class Post extends Model {
  @column()
  declare status: string = 'draft'; // Default value

  @column({ autoCreate: true })
  declare publishedAt: Date; // Automatically set to now on create
}
```

## Retrieving Models

Once you have created a model and its associated database table, you are ready to start retrieving data. Think of each model as a powerful query builder.

### Retrieving All Models

The `all` method returns all records from the model's table:

```typescript
const flights = await Flight.all();

for (const flight of flights) {
  console.log(flight.name);
}
```

### Building Queries

You can use methods like `where`, `orderBy`, and `limit` to build queries:

```typescript
const flights = await Flight.where('active', 1)
  .orderBy('name', 'desc')
  .limit(10)
  .get();
```

> **Note**: Atlas query methods (like `where`) return a query builder instance. The SQL is not executed until you call `get()` or `first()`.

### Retrieving Single Models

Use `find` to retrieve by primary key, or `first` to get the first result of a query:

```typescript
// Retrieve by primary key
const flight = await Flight.find(1);

// Retrieve first matching record
const flight = await Flight.where('number', 'FR 900').first();
```

### Not Found Exceptions

If you want to throw an exception when a model is not found (useful for HTTP 404 responses), use `findOrFail`:

```typescript
try {
  const flight = await Flight.findOrFail(1);
} catch (e) {
  // Throws ModelNotFoundError
}
```

### Cursors & Chunking

When processing large amounts of data, `all()` might exhaust memory. Atlas provides `cursor()` and `lazyAll()` methods for streaming data:

```typescript
// Use async iterator to process one chunk at a time (default 1000 records)
for await (const users of User.cursor()) {
  for (const user of users) {
    await user.process();
  }
}
```

## Inserts & Updates

### Inserting Models

To create a new record, instantiate the model, set attributes, and call `save`:

```typescript
const flight = new Flight();
flight.name = 'Taipei to Tokyo';
flight.number = 'JL 999';

await flight.save();
```

Or use the `create` method to do it in one line:

```typescript
const flight = await Flight.create({
  name: 'Taipei to Tokyo',
  number: 'JL 999'
});
```

Note: `Model.create()` is async and persists immediately. Use `Model.make()` if you need an in-memory instance before calling `save()`.

### Updating Models

Retrieve a model, modify attributes, and call `save` again:

```typescript
const flight = await Flight.find(1);

if (flight) {
  flight.name = 'Updated Name';
  await flight.save();
}
```

### Mass Updates

Updates can be performed against any number of models that match a given query. Note: **Mass updates will not trigger model events**.

```typescript
await Flight.where('active', 1)
  .where('destination', 'San Diego')
  .update({ delayed: true });
```

## Deleting Models

### Deleting a Single Model

Call `delete` on a model instance:

```typescript
const flight = await Flight.find(1);
await flight.delete();
```

### Deleting via Query

```typescript
await Flight.where('active', 0).delete();
```

### Soft Deletes

In addition to actually removing records, Atlas supports "soft deletes". Soft deleted models are not removed from the database; instead, a `deleted_at` attribute is set.

To enable soft deletes, use the `@SoftDeletes` decorator:

```typescript
import { Model, SoftDeletes } from '@gravito/atlas';

@SoftDeletes()
class Flight extends Model {
  // ...
}
```

Now when you call `delete`, the `deleted_at` column is set to the current time. Queries will automatically exclude soft deleted models.

#### Restoring Soft Deleted Models

```typescript
// Check if trashed (if implemented via helper, otherwise check deleted_at)
// await flight.restore();
```

#### Permanently Deleting

```typescript
await flight.forceDelete();
```

## Query Scopes

Scopes allow you to encapsulate common query constraints in your model classes.

### Local Scopes

Define methods starting with `scope` in your model:

```typescript
class User extends Model {
  // Define scope
  scopePopular(query) {
    return query.where('votes', '>', 100);
  }

  scopeActive(query) {
    return query.where('active', true);
  }
}

// Use scope (call without the 'scope' prefix, lower camelCase)
const popularUsers = await User.query().popular().active().get();
```

## Model Events

Atlas models fire several lifecycle events: `creating`, `created`, `updating`, `updated`, `saving`, `saved`, `deleting`, `deleted`.

You can define `on[Event]` methods to hook into these:

```typescript
class User extends Model {
  async onCreating() {
    if (!this.uuid) {
      this.uuid = crypto.randomUUID();
    }
  }
}
```
