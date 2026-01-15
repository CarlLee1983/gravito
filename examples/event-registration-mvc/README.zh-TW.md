# 線上報名系統

> 🎯 使用 Gravito Framework 建立的活動報名範例

## 功能特色

- 📋 **活動與場次管理** - 建立活動並設定多個場次
- 📝 **動態報名表單** - 自訂欄位 (文字、下拉選單、核取方塊等)
- 🔐 **使用者認證** - 登入/註冊功能 (OrbitSentinel)
- 📧 **Email 通知** - 報名確認信 (@gravito/signal)
- 📱 **QR Code 簽到** - 產生並掃描 QR Code 進行簽到
- 👤 **個人儀表板** - 查看報名記錄
- 🛠️ **管理後台** - 完整的活動、場次、欄位、使用者 CRUD

## 快速開始

```bash
# 安裝依賴
bun install

# 啟動開發伺服器
bun run dev

# 伺服器運行於 http://localhost:3000
```

## 技術堆疊

| 層級 | 技術 |
|------|------|
| 後端 | Gravito Framework (Bun) |
| ORM | @gravito/atlas |
| 認證 | @gravito/sentinel |
| Email | @gravito/signal |
| 前端 | Vue 3 + Inertia.js |
| 樣式 | UnoCSS |

## 預設帳號

| 角色 | Email | 密碼 |
|------|-------|------|
| 管理員 | admin@example.com | password |
| 一般使用者 | user@example.com | password |

## 文件

- [PLANNING.md](./PLANNING.md) - 完整系統設計與資料模型
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 技術架構說明

---

**屬於 [Gravito Framework](https://github.com/gravito-framework) 範例集。**
