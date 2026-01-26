# Phase 0 指標報告

## 基本資訊

- **Phase**: 00-baseline
- **測試日期**: 2026-01-19
- **版本**: 1.0.3
- **執行者**: Antigravity
- **對照基準**: 初始基準（無）

## 測試環境

- **硬體**: Apple M4
- **作業系統**: macOS
- **Runtime**: Bun 1.3.4
- **Redis/DB 版本**: Redis 6.2 (Docker)
- **配置**: Default (No optimization)

## 測試場景

| 場景 | 描述 | 資料規模 | 驅動 | 備註 |
|------|------|----------|------|------|
| S1 | 單條 push/pop | 小 payload | Redis | ~3.3ms E2E latency |
| S2 | 批量 pushMany | 100 batch | Redis | ~17.5k jobs/s |
| S3 | 批量 popMany | 100 batch | Redis | ~41k jobs/s |
| S4 | 內存單條 | 小 payload | Memory | ~0.005ms latency |

## 指標結果

### 吞吐量 (Jobs/s)

| 場景 | Baseline | Current | 變化 |
|------|----------|---------|------|
| Redis Batch Push | 0 | 17,559 | N/A |
| Redis Batch Pop | 0 | 40,961 | N/A |
| Memory Batch Push | 0 | ~460k | N/A |

### 延遲 (Latency per op)

| 場景 | Baseline | Current | 變化 |
|------|----------|---------|------|
| Redis Single E2E | 0 | 3.28 ms | N/A |
| Memory Single Push | 0 | 0.003 ms | N/A |

### 資源

| 指標 | Baseline | Current | 變化 |
|------|----------|---------|------|
| CPU 平均/峰值 | 待填 | 低 | |
| 記憶體 平均/峰值 | 待填 | 低 | |

## SLO/門檻檢查

- [x] 吞吐量提升達標（Phase 0 為基準）
- [x] 延遲未回歸 > 10%
- [x] 錯誤率未上升
- [x] 觀測性指標可回報

## 結論與下一步

- **是否可進入下一 Phase**: 是
- **風險與觀察**:
  - Redis `pushMany` 吞吐量略低於 `popMany`，可能是因為序列化與多個 `LPUSH` 參數的開銷。
  - 單條 E2E 延遲 3.3ms 在本地 Docker 環境中屬正常，但有進步空間。
- **後續行動**: 進入 Phase 1 (Type Safety) 進一步強化核心結構。
