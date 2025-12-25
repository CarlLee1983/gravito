# Atlas ORM 模型關聯

資料庫中的資料表通常彼此相關。例如，一篇部落格文章可能有許多評論，或者一個訂單對應一個下單的使用者。Atlas 讓管理和處理這些關聯變得簡單，並支援多種常見的關聯類型：

-   [一對一 (One To One)](#one-to-one)
-   [一對多 (One To Many)](#one-to-many)
-   [多對多 (Many To Many)](#many-to-many)
-   [多型關聯 (Polymorphic Relationships)](#polymorphic-relationships)

## 定義關聯 (Defining Relationships)

Atlas 關聯是透過在模型類別屬性上使用裝飾器 (Decorators) 來定義的。

### 一對一 (One To One) <a id="one-to-one"></a>

一對一關聯是非常基本的關聯。例如，一個 `User` 模型可能關聯一個 `Phone` 模型。我們可以使用 `@HasOne` 裝飾器來定義此關聯：

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

傳遞給 `@HasOne` 的第一個參數是關聯模型的類別工廠函數。定義好關聯後，我們可以透過模型的屬性來獲取關聯記錄 (支援延遲預加載)：

```typescript
const phone = await user.phone;
```

#### 定義反向關聯 (Belongs To)

在 `Phone` 模型中，我們可以使用 `@BelongsTo` 裝飾器來定義反向關聯，讓我們可以存取擁有該電話的使用者：

```typescript
import { Model, column, BelongsTo } from '@gravito/atlas';
import { User } from './User';

export class Phone extends Model {
  @BelongsTo(() => User)
  declare user: User;
}
```

### 一對多 (One To Many) <a id="one-to-many"></a>

一對多關聯用於定義單一模型擁有多個子模型的關係。例如，一篇部落格文章可能有無限數量的評論。我們可以使用 `@HasMany` 裝飾器：

```typescript
import { Model, column, HasMany } from '@gravito/atlas';
import { Comment } from './Comment';

export class Post extends Model {
  @HasMany(() => Comment)
  declare comments: Comment[];
}
```

與一對一關聯類似，您可以透過屬性存取評論集合：

```typescript
const comments = await post.comments;

for (const comment of comments) {
  // ...
}
```

#### 反向關聯

在 `Comment` 模型中，使用 `@BelongsTo` 來定義它屬於哪篇文章：

```typescript
import { Model, column, BelongsTo } from '@gravito/atlas';
import { Post } from './Post';

export class Comment extends Model {
  @BelongsTo(() => Post)
  declare post: Post;
}
```

### 多對多 (Many To Many) <a id="many-to-many"></a>

多對多關聯比 `HasOne` 和 `HasMany` 稍微複雜一些。例如，一個使用者可能有許多角色 (Roles)，而一個角色也可能被許多使用者擁有。這需要三個資料表：`users`、`roles` 和 `role_user` (樞紐表)。

使用 `@BelongsToMany` 裝飾器來定義：

```typescript
import { Model, column, BelongsToMany } from '@gravito/atlas';
import { Role } from './Role';

export class User extends Model {
  @BelongsToMany(() => Role)
  declare roles: Role[];
}
```

Atlas 會預設依據模型名稱的字母順序來推斷樞紐表名稱 (例如 `role_user`)。您也可以透過選項自定義：

```typescript
@BelongsToMany(() => Role, { 
  pivotTable: 'user_assigned_roles',
  foreignKey: 'user_ref_id',
  relatedKey: 'role_ref_id'
})
declare roles: Role[];
```

## 多型關聯 (Polymorphic Relationships) <a id="polymorphic-relationships"></a>

多型關聯允許一個模型在單個關聯下屬於多個不同類型的模型。

### 一對一多型

例如，`User` 和 `Post` 可能都有一個 `Image`。使用 `@MorphOne`：

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

在 `Image` 模型中，使用 `@MorphTo`：

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

### 一對多多型

最常見的例子是 `Comment` 模型，它可能屬於 `Post` 或 `Video`。

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

在 `Comment` 模型中：

```typescript
class Comment extends Model {
  @MorphTo()
  declare commentable: Post | Video;
}
```

## 查詢關聯 (Querying Relations)

由於 Atlas 的關聯定義 (如 `HasMany`) 在呼叫時會回傳查詢建構器 (Query Builder)，您可以對其進行鏈式呼叫以添加更多約束。

```typescript
const user = await User.find(1);

// 獲取標題包含 'First' 的文章
const posts = await user.posts()
  .where('title', 'like', '%First%')
  .get();
```

> **注意**：`BelongsToMany` 關聯目前版本直接回傳結果 Promise，不支援鏈式查詢。

### 關聯存在性查詢

使用 `whereHas` 來查詢「至少存在一個」特定關聯的記錄：

```typescript
// 獲取至少有一則評論的文章
const posts = await Post.query()
  .whereHas('comments')
  .get();
```

您也可以指定回調函數來進一步過濾關聯：

```typescript
// 獲取至少有一則內容包含 'foo' 的評論的文章
const posts = await Post.query()
  .whereHas('comments', (query) => {
    query.where('content', 'like', '%foo%');
  })
  .get();
```

## 預加載 (Eager Loading) <a id="eager-loading"></a>

當您以屬性方式存取關聯 (例如 `user.posts`) 時，該關聯數據是「延遲加載」的。這意味著直到您存取該屬性，資料才會從資料庫載入。

這可能導致 N+1 查詢問題。為了解決此問題，您可以使用 `with` 方法進行「預加載」：

```typescript
const users = await User.query().with('posts').get();

for (const user of users) {
  // posts 已預先載入，不會產生額外查詢
  console.log(user.posts); 
}
```

### 預加載多個關聯

```typescript
const users = await User.query().with(['posts', 'profile']).get();
```

### 巢狀預加載

使用點記號 (dot syntax) 來預加載巢狀關聯：

```typescript
const users = await User.query().with('posts.comments').get();
```

### 帶有約束的預加載

```typescript
const users = await User.query()
  .with({
    posts: (query) => {
      query.where('title', 'like', '%First%');
    }
  })
  .get();
```

### 延遲預加載 (Lazy Eager Loading)

如果您已經獲取了父模型，可以使用 `load` 方法來載入關聯：

```typescript
const user = await User.find(1);

await user.load('posts');
```

## 插入與更新關聯

### Save 方法

Atlas 目前不支援直接透過關聯方法進行 `save` (如 `post.comments().save(...)`)。您應該手動設定外鍵：

```typescript
const comment = new Comment();
comment.content = 'A new comment';
comment.post_id = post.id; // 設定外鍵
await comment.save();
```

或者，對於 `HasMany` 關聯，因為它回傳查詢建構器，您可以使用 `insert`：

```typescript
await post.comments().insert({
  content: 'A new comment',
  created_at: new Date()
});
```

### 多對多關聯操作

對於 `BelongsToMany`，目前建議直接操作樞紐表 (Pivot Table)：

```typescript
// 附加角色 (Attach)
await DB.table('role_user').insert({
  user_id: user.id,
  role_id: role.id
});

// 移除角色 (Detach)
await DB.table('role_user')
  .where('user_id', user.id)
  .where('role_id', role.id)
  .delete();
```