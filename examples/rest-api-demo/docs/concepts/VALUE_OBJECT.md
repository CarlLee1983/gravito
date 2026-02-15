# Value Object（值對象）

## 1. 定義

值對象是沒有身份的領域對象。兩個值對象的相等性由其**屬性值**決定。值對象通常是不可變的，這意味著它們一旦創建就不能被修改。

## 2. 核心特徵

```typescript
// Value Object：
// - 無唯一標識符
// - 不可變（Immutable）
// - 屬性值決定相等性

// ✅ Email 是 Value Object
class Email {
  constructor(readonly value: string) {
    if (!this.isValid(value)) throw new Error('Invalid email')
    Object.freeze(this) // 強制不可變
  }

  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // 必須自己定義 equals 方法
  equals(other: Email): boolean {
    return this.value === other.value  // 值相等
  }
}
```

### 使用領域語言運算

```typescript
// ✅ Money 是 Value Object
class Money {
  constructor(
    readonly amount: number,
    readonly currency: string
  ) {
    Object.freeze(this)
  }

  equals(other: Money): boolean {
    return this.amount === other.amount &&
           this.currency === other.currency
  }

  // 方法返回新實例 (Side-effect free)
  add(other: Money): Money {
    if (this.currency !== other.currency)
      throw new Error('Cannot add different currencies')
    return new Money(this.amount + other.amount, this.currency)
  }
}

const price1 = new Money(10, 'USD')
const price2 = new Money(5, 'USD')
const total = price1.add(price2)  // Money { amount: 15, currency: 'USD' }
```

## 3. 進階設計

### TS 中的不可變模式

在 TypeScript 中，應該利用型別系統來強化不可變性：

1.  **Readonly Properties**：在類別定義時加上 `readonly` 修飾符。
2.  **Object.freeze()**：在建構子最後一行使用 `Object.freeze(this)` 防止 runtime 修改。
3.  **Readonly Utility Type**：對於傳遞的對象參數使用 `Readonly<T>`。

```typescript
// 強制不可變的 Address 值對象
class Address {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly zip: string
  ) {
    if (!zip.match(/^\d{5}$/)) throw new Error("Invalid Zip");
    Object.freeze(this);
  }
}

const addr = new Address("Main St", "NY", "10001");
// addr.city = "LA"; // TS Error: Cannot assign to 'city' because it is a read-only property.
// (addr as any).city = "LA"; // Runtime Error: Cannot assign to read only property 'city' of object
```

### 複合值對象

值對象可以包含其他值對象。例如 `CustomerProfile` 可以包含 `Address` 和 `Email`。

```typescript
class CustomerProfile {
  constructor(
    public readonly name: string,
    public readonly email: Email,
    public readonly address: Address
  ) {
    Object.freeze(this);
  }
}
```

這樣可以讓領域模型更清晰，將驗證邏輯分散到各個小的值對象中，而不是全部堆在一個巨大的實體類別裡。
