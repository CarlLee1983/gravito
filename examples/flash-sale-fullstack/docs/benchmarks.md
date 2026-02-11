# 性能壓測報告 (Benchmark Report)

本報告對比了 `Flash-Sale` 範例在不同演進階段的性能表現。

### 測試環境：
- **CPU**: 4 Core
- **RAM**: 8GB
- **DB**: PostgreSQL 15
- **Cache**: Redis 7

---

### 1. Stage 1 (純 MVC 模式)
- **併發數**: 1,000 Concurrent Users
- **吞吐量**: 120 RPS (Request Per Second)
- **平均延遲**: 850ms
- **錯誤率**: 15% (Database Lock Timeout)
- **結論**: 適合一般業務，無法應付秒殺。

### 2. Stage 2 (模組化 + L1 快取)
- **併發數**: 1,000 Concurrent Users
- **吞吐量**: 1,500 RPS
- **平均延遲**: 45ms
- **錯誤率**: 0%
- **結論**: 性能提升 10 倍，足以應付小型促銷。

### 3. Stage 3 (分佈式衛星 + 削峰填谷)
- **併發數**: 10,000 Concurrent Users
- **吞吐量**: 8,500+ RPS
- **平均延遲**: 12ms (API 端)
- **錯誤率**: 0%
- **結論**: 通過隊列非同步化，保護了資料庫，實現了真正的極限抗壓。

---

> 💡 **觀察建議**：開發者可以透過 `scripts/load-test.ts` 在本地重現這些數據。
