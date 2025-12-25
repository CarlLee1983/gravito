# API 資源轉換 (API Resources)

在構建 API 時，直接返回模型 (Model) 通常不是最佳做法。您可能需要重命名屬性、隱藏敏感資料、轉換數據格式，或是根據使用者的權限回傳不同的結構。

雖然 Atlas 沒有內建專門的 `JsonResource` 類別，但我們推薦使用 **標準 TypeScript 類別** 來實作這一模式。這不僅型別安全，而且效能極佳。

## 定義資源 (Defining Resources)

一個資源類別本質上就是一個包裝器 (Wrapper)，負責將模型轉換為陣列或物件。

我們可以建立一個簡單的 `UserResource` 類別：

```typescript
import type { User } from '../models/User';

export class UserResource {
  constructor(private user: User) {}

  /**
   * 靜態工廠方法，方便鏈式調用
   */
  static make(user: User | null): UserResource | null {
    if (!user) return null;
    return new UserResource(user);
  }

  /**
   * 將資源轉換為 JSON 結構
   */
  toJSON() {
    return {
      id: this.user.id,
      full_name: this.user.name, // 重命名屬性
      email: this.user.email,
      is_active: Boolean(this.user.active), // 轉換格式
      created_at: this.user.created_at.toISOString(),
      updated_at: this.user.updated_at.toISOString(),
    };
  }
}
```

## 使用資源

在您的控制器 (Controller) 中，您可以使用資源來包裝模型並回傳：

```typescript
import { User } from '../models/User';
import { UserResource } from '../resources/UserResource';

export class UserController {
  async show(c: Context) {
    const user = await User.find(1);
    
    return c.json(UserResource.make(user));
  }
}
```

由於大多數現代框架 (包括 Gravito) 在序列化 JSON 時會自動呼叫物件的 `toJSON()` 方法，因此上述程式碼會自動輸出轉換後的結構。

## 資源集合 (Resource Collections)

若要轉換模型陣列，我們可以在資源類別中新增一個靜態方法：

```typescript
export class UserResource {
  // ... 其他程式碼

  static collection(users: User[]) {
    return users.map((user) => UserResource.make(user));
  }
}
```

使用方式：

```typescript
const users = await User.all();

return c.json(UserResource.collection(users));
```

## 處理關聯 (Relationships)

資源的一個重要功能是處理關聯數據。您應該檢查關聯是否已載入，以避免 N+1 查詢問題。

```typescript
import { PostResource } from './PostResource';

export class UserResource {
  // ...

  toJSON() {
    return {
      id: this.user.id,
      name: this.user.name,
      
      // 僅當 posts 關聯已載入時才包含
      posts: this.user.posts 
        ? PostResource.collection(this.user.posts) 
        : undefined,
    };
  }
}
```

這樣一來，如果您在查詢時使用了 `.with('posts')`，`posts` 欄位就會出現在 API 回應中；否則就會被忽略。

## 條件屬性 (Conditional Attributes)

有時您可能只想在特定條件下 (例如當前使用者是管理員) 才回傳某些欄位：

```typescript
export class UserResource {
  constructor(
    private user: User, 
    private isAdmin: boolean = false
  ) {}

  toJSON() {
    return {
      id: this.user.id,
      name: this.user.name,
      // 僅管理員可見
      ...(this.isAdmin && { email: this.user.email, phone: this.user.phone }),
    };
  }
}
```

## 為什麼不使用自動化庫？

使用原生 TypeScript 類別有幾個顯著優勢：

1.  **極致效能**：沒有複雜的反射或執行時開銷，這只是單純的物件屬性存取。
2.  **型別安全**：IDE 可以完全理解您的回應結構，前端若與後端共用型別定義，能獲得完整的自動完成支援。
3.  **靈活性**：您可以隨意新增方法、計算屬性或依賴注入，完全不受框架限制。
