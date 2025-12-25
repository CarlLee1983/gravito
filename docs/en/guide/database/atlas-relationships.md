# Atlas ORM Relationships

Database tables are often related to one another. For example, a blog post may have many comments, or an order may be related to the user who placed it. Atlas makes managing and working with these relationships easy and supports several common relationship types:

-   [One To One](#one-to-one)
-   [One To Many](#one-to-many)
-   [Many To Many](#many-to-many)
-   [Polymorphic Relationships](#polymorphic-relationships)

## Defining Relationships

Atlas relationships are defined using decorators on your model class properties.

### One To One <a id="one-to-one"></a>

A one-to-one relationship is a very basic type of relation. For example, a `User` model might be associated with one `Phone`. We can define this relationship using the `@HasOne` decorator:

```typescript
import { Model, column, HasOne } from '@gravito/atlas';
import { Phone } from './Phone';

export class User extends Model {
  @column({ isPrimary: true })
  declare id: number;

  @HasOne(() => Phone)
  declare phone: Phone;
}
```

The first argument passed to `@HasOne` is the class factory function of the related model. Once the relationship is defined, we can retrieve the related record using the model's property (supports lazy loading):

```typescript
const phone = await user.phone;
```

#### Defining the Inverse (Belongs To)

On the `Phone` model, we can use the `@BelongsTo` decorator to define the inverse relationship, allowing us to access the user who owns the phone:

```typescript
import { Model, column, BelongsTo } from '@gravito/atlas';
import { User } from './User';

export class Phone extends Model {
  @BelongsTo(() => User)
  declare user: User;
}
```

### One To Many <a id="one-to-many"></a>

A one-to-many relationship defines a relationship where a single model owns multiple other models. For example, a blog post may have an infinite number of comments. We can use the `@HasMany` decorator:

```typescript
import { Model, column, HasMany } from '@gravito/atlas';
import { Comment } from './Comment';

export class Post extends Model {
  @HasMany(() => Comment)
  declare comments: Comment[];
}
```

Like the one-to-one relationship, you can access the collection of comments via the property:

```typescript
const comments = await post.comments;

for (const comment of comments) {
  // ...
}
```

#### Inverse Relationship

On the `Comment` model, use `@BelongsTo` to define which post it belongs to:

```typescript
import { Model, column, BelongsTo } from '@gravito/atlas';
import { Post } from './Post';

export class Comment extends Model {
  @BelongsTo(() => Post)
  declare post: Post;
}
```

### Many To Many <a id="many-to-many"></a>

Many-to-many relationships are slightly more complicated than `HasOne` and `HasMany`. An example of such a relationship is a user with many roles, where the roles are also shared by other users. This requires three tables: `users`, `roles`, and `role_user` (the pivot table).

Use the `@BelongsToMany` decorator to define this:

```typescript
import { Model, column, BelongsToMany } from '@gravito/atlas';
import { Role } from './Role';

export class User extends Model {
  @BelongsToMany(() => Role)
  declare roles: Role[];
}
```

Atlas will determine the pivot table name by default using the alphabetical order of the model names (e.g., `role_user`). You can customize this via options:

```typescript
@BelongsToMany(() => Role, { 
  pivotTable: 'user_assigned_roles',
  foreignKey: 'user_ref_id',
  relatedKey: 'role_ref_id'
})
declare roles: Role[];
```

## Polymorphic Relationships <a id="polymorphic-relationships"></a>

Polymorphic relationships allow a model to belong to more than one other type of model on a single association.

### One To One Polymorphic

For example, a `User` and a `Post` might both share a polymorphic relation to an `Image`. Use `@MorphOne`:

```typescript
class Post extends Model {
  @MorphOne(() => Image, 'imageable')
  declare image: Image;
}

class User extends Model {
  @MorphOne(() => Image, 'imageable')
  declare image: Image;
}
```

On the `Image` model, use `@MorphTo`:

```typescript
class Image extends Model {
  @column()
  declare imageable_id: number;

  @column()
  declare imageable_type: string;

  @MorphTo()
  declare imageable: Post | User;
}
```

### One To Many Polymorphic

The most common example is a `Comment` model, which might belong to either a `Post` or a `Video`.

```typescript
class Post extends Model {
  @MorphMany(() => Comment, 'commentable')
  declare comments: Comment[];
}

class Video extends Model {
  @MorphMany(() => Comment, 'commentable')
  declare comments: Comment[];
}
```

On the `Comment` model:

```typescript
class Comment extends Model {
  @MorphTo()
  declare commentable: Post | Video;
}
```

## Querying Relations

Since Atlas relationship definitions (like `HasMany`) return a Query Builder when called as a method, you can chain calls to add further constraints.

```typescript
const user = await User.find(1);

// Retrieve posts with title containing 'First'
const posts = await user.posts()
  .where('title', 'like', '%First%')
  .get();
```

> **Note**: `BelongsToMany` relationships currently return a Promise with results immediately and do not support chained querying.

### Relationship Existence

Use `whereHas` to retrieve records that have at least one of a specified relationship:

```typescript
// Retrieve posts that have at least one comment
const posts = await Post.query()
  .whereHas('comments')
  .get();
```

You can also specify a callback to further filter the relationship:

```typescript
// Retrieve posts that have at least one comment containing 'foo'
const posts = await Post.query()
  .whereHas('comments', (query) => {
    query.where('content', 'like', '%foo%');
  })
  .get();
```

## Eager Loading <a id="eager-loading"></a>

When you access a relationship as a property (e.g., `user.posts`), the relationship data is "lazy loaded". This means the data is not loaded from the database until you access the property.

This can lead to the N+1 query problem. To solve this, use the `with` method for "eager loading":

```typescript
const users = await User.query().with('posts').get();

for (const user of users) {
  // Posts are preloaded, no extra query
  console.log(user.posts); 
}
```

### Eager Loading Multiple Relationships

```typescript
const users = await User.query().with(['posts', 'profile']).get();
```

### Nested Eager Loading

Use dot syntax to eager load nested relationships:

```typescript
const users = await User.query().with('posts.comments').get();
```

### Eager Loading with Constraints

```typescript
const users = await User.query()
  .with({
    posts: (query) => {
      query.where('title', 'like', '%First%');
    }
  })
  .get();
```

### Lazy Eager Loading

If you have already retrieved the parent model, you can use the `load` method to load relationships:

```typescript
const user = await User.find(1);

await user.load('posts');
```

## Inserting & Updating Related Models

### Save Method

Atlas does not currently support `save` directly via relationship methods (e.g., `post.comments().save(...)`). You should manually set the foreign key:

```typescript
const comment = new Comment();
comment.content = 'A new comment';
comment.post_id = post.id; // Set foreign key
await comment.save();
```

Or, for `HasMany` relationships (since they return a query builder), you can use `insert`:

```typescript
await post.comments().insert({
  content: 'A new comment',
  created_at: new Date()
});
```

### Many To Many Operations

For `BelongsToMany`, it is currently recommended to operate directly on the Pivot Table:

```typescript
// Attach role
await DB.table('role_user').insert({
  user_id: user.id,
  role_id: role.id
});

// Detach role
await DB.table('role_user')
  .where('user_id', user.id)
  .where('role_id', role.id)
  .delete();
```