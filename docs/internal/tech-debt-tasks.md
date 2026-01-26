# 技術債任務清單 (Task Tracker)

> 📖 完整規劃請參考: [technical-debt-cleanup-plan.md](./technical-debt-cleanup-plan.md)

**分支**: `tech-debt/comprehensive-cleanup`  
**創建**: 2026-01-16  
**狀態**: 🟡 進行中

---

## 📊 進度總覽

| Phase | 任務 | 優先級 | 預估 | 狀態 | 負責人 |
|-------|-----|--------|------|------|--------|
| 5 | Ripple RedisDriver | 🔴 P1 | 4h | ⬜ 待開始 | - |
| 6 | Pulsar Flash Data | 🔴 P1 | 2h | ⬜ 待開始 | - |
| 7 | Fortify Email 整合 | 🟡 P2 | 2h | ⬜ 待開始 | - |
| 8 | Core `any` 精簡 | 🟡 P2 | 3h | ⬜ 待開始 | - |
| 9 | 空 Catch 修復 | 🟢 P3 | 0.5h | ⬜ 待開始 | - |
| 10 | Deprecated API 評估 | 🟢 P3 | 1h | ⬜ 待開始 | - |

**圖例**: ⬜ 待開始 | 🔄 進行中 | ✅ 完成 | ❌ 取消

---

## 🔴 Phase 5: Ripple RedisDriver

### 任務項目
- [ ] 5.1 創建 `packages/ripple/src/drivers/RedisDriver.ts`
- [ ] 5.2 實現 `RippleDriver` 接口
- [ ] 5.3 更新 `RippleServer.ts` constructor
- [ ] 5.4 更新 `types.ts` 添加配置類型
- [ ] 5.5 添加 `ioredis` 為 optional peerDependency
- [ ] 5.6 編寫測試 `tests/redis-driver.test.ts`
- [ ] 5.7 更新 README 文檔

### 關鍵文件
```
packages/ripple/
├── src/
│   ├── drivers/
│   │   ├── index.ts        # 更新 export
│   │   ├── LocalDriver.ts  # 參考
│   │   └── RedisDriver.ts  # 新建
│   ├── types.ts            # 更新
│   └── RippleServer.ts     # Line 66 修改
├── tests/
│   └── redis-driver.test.ts # 新建
└── package.json            # 添加 peerDep
```

---

## 🔴 Phase 6: Pulsar Flash Data

### 任務項目
- [ ] 6.1 查看 `packages/pulsar/src/index.ts:200` 附近代碼
- [ ] 6.2 實現 `flash()` 方法
- [ ] 6.3 實現 `getFlash()` 方法
- [ ] 6.4 更新 `save()` 持久化 flash data
- [ ] 6.5 更新 `load()` 載入 flash data
- [ ] 6.6 編寫測試 `tests/flash.test.ts`

### 關鍵文件
```
packages/pulsar/
├── src/
│   └── index.ts  # Line 200 附近
└── tests/
    └── flash.test.ts  # 新建
```

---

## 🟡 Phase 7: Fortify Email

### 任務項目
- [ ] 7.1 創建 `packages/fortify/src/mail/VerifyEmailMail.ts`
- [ ] 7.2 創建 `packages/fortify/src/mail/ResetPasswordMail.ts`
- [ ] 7.3 更新 `VerifyEmailController.ts:136`
- [ ] 7.4 更新 `ForgotPasswordController.ts:66`
- [ ] 7.5 添加 `@gravito/signal` 依賴
- [ ] 7.6 編寫/更新測試

### 關鍵文件
```
packages/fortify/
├── src/
│   ├── mail/
│   │   ├── VerifyEmailMail.ts    # 新建
│   │   └── ResetPasswordMail.ts  # 新建
│   └── controllers/
│       ├── VerifyEmailController.ts     # Line 136
│       └── ForgotPasswordController.ts  # Line 66
└── package.json  # 更新
```

---

## 🟡 Phase 8: Core `any` 精簡

### 任務項目
- [ ] 8.1 `catch (error: any)` → `catch (error: unknown)` (全局)
- [ ] 8.2 評估 `Route.ts` 靜態方法類型改善
- [ ] 8.3 評估 `runtime.ts` Deno 類型處理
- [ ] 8.4 評估 `BunNativeAdapter.ts` context 類型
- [ ] 8.5 記錄無法消除的 `any` 及原因
- [ ] 8.6 確保 typecheck 通過

### 關鍵文件
```
packages/core/src/
├── Route.ts              # 12 處 any
├── runtime.ts            # 10 處 any (Deno)
├── GravitoServer.ts      # Line 63
├── adapters/
│   └── bun/
│       └── BunNativeAdapter.ts  # 6 處 any
└── testing/              # 12 處 any (低優先)
```

---

## 🟢 Phase 9: 空 Catch 修復

### 任務項目
- [ ] 9.1 修復 `packages/pulsar/src/index.ts:317`
- [ ] 9.2 修復 `packages/launchpad/debug-launch.ts:24`
- [ ] 9.3 修復 `packages/cli/src/commands/add.ts:75`

---

## 🟢 Phase 10: Deprecated API

### 任務項目
- [ ] 10.1 創建 `docs/MIGRATION.md`
- [ ] 10.2 為每個 deprecated API 設定移除版本
- [ ] 10.3 評估是否添加 runtime warning

---

## 🔧 開發指南

### 開始工作
```bash
git checkout tech-debt/comprehensive-cleanup
git pull origin tech-debt/comprehensive-cleanup
```

### 每個 Phase 完成後
```bash
bun install
bun run typecheck
bun test

# 提交
git add .
git commit -m "tech-debt(phase-X): <description>"
git push origin tech-debt/comprehensive-cleanup
```

### 完成標準
1. ✅ 代碼變更符合計畫
2. ✅ `bun run typecheck` 無錯誤
3. ✅ `bun test` 全部通過
4. ✅ 更新此任務清單的狀態

---

## 📝 備註區

> 在此記錄實施過程中的發現、問題或決策

### 實施備註
_(待填寫)_

### 遇到的問題
_(待填寫)_

### 決策變更
_(待填寫)_

---

**最後更新**: 2026-01-16
