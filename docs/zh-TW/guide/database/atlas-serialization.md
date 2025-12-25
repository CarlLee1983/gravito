# 模型序列化 (Serialization)

構建 API 時，您經常需要將模型轉換為陣列或 JSON。Atlas 包含了方便的方法來執行這些轉換，並允許您控制序列化中包含哪些屬性。

## 序列化模型與集合

### 轉換為 JSON

要將模型轉換為 JSON，您應該使用 `toJSON` 方法。

```typescript
const user = await User.find(1);
return user.toJSON();
```

如果您有一個模型陣列（集合），在從 Hono 或 Gravito 路由返回它時，框架會自動對每個模型調用 `toJSON`。

## 從 JSON 中隱藏屬性

有時您可能希望限制包含在模型陣列或 JSON 中的屬性（例如密碼）。為此，請在您的模型中新增 `hidden` 屬性：

```typescript
class User extends Model {
  // 這些屬性將在 JSON 輸出中被忽略
  static override hidden = ['password', 'remember_token'];
}
```

## 在 JSON 中追加值

有時，您可能需要新增在資料庫中沒有對應欄位的屬性。為此，首先為該值定義一個存取器 (getter)：

```typescript
class User extends Model {
  get is_admin() {
    return this.role === 'admin';
  }

  // 將此 getter 包含在序列化輸出中
  static override appends = ['is_admin'];
}
```
