# 修改器與型別轉換 (Mutators & Casting)

修改器與屬性轉換允許您在從模型實例獲取或設置屬性值時，對其進行轉換。

## 屬性轉換 (Attribute Casting)

屬性轉換提供了類似於修改器的功能，但不需要您定義任何額外的方法。相反，您只需在模型的 `_casts` 屬性中定義如何轉換屬性。

### 支援的轉換類型

支援的類型包括：`integer`, `float`, `string`, `boolean`, `object`, `array`, `date`, `datetime`, 與 `json`。

```typescript
import { Model, column } from '@gravito/atlas';

class User extends Model {
  @column()
  declare options: Record<string, any>;

  @column()
  declare is_admin: boolean;

  // 定義轉換
  static override _casts = {
    options: 'json',
    is_admin: 'boolean',
    created_at: 'datetime'
  };
}
```

### 陣列與 JSON 轉換

`json` 轉換對於處理以序列化 JSON 形式存儲的欄位特別有用。

```typescript
const user = await User.find(1);

// 'options' 會自動轉換為物件，而非字串
if (user.options.is_pro) {
    // ...
}
```

## 日期轉換

預設情況下，Atlas 會將 `created_at` 與 `updated_at` 處理為 Date 物件。您也可以定義其他欄位作為日期處理：

```typescript
static override _casts = {
  published_at: 'date',
};
```

## 自定義存取器 (Accessors)

雖然 Atlas 不使用 Laravel 的 `get{Attribute}Attribute` 語法，但您可以使用標準的 TypeScript getter 來建立「虛擬」屬性：

```typescript
class User extends Model {
  @column()
  declare first_name: string;

  @column()
  declare last_name: string;

  // 虛擬屬性
  get full_name() {
    return `${this.first_name} ${this.last_name}`;
  }
}
```
