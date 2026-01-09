---
title: Luminosity CLI
description: Sitemap 產生與維護的命令列工具。
---

# Luminosity CLI

Luminosity CLI（`@gravito/luminosity-cli`）提供 Sitemap 產生與維護的命令列工具。

## 特色

- CLI 方式產生 Sitemap
- 快取管理與更新
- 可用於 CI/CD 部署流程

## 安裝

```bash
bun add @gravito/luminosity-cli
```

## 常用指令

```bash
# 產生 Sitemap
gravito-seo generate

# 清除快取
gravito-seo flush
```

## CI/CD 範例

```yaml
- name: Generate sitemap
  run: gravito-seo generate
```

## 使用說明

- 需要手動控制或 CI 整合時可使用 CLI。
- 建議搭配 Luminosity 設定檔以確保輸出一致。

## 下一步

- 參考 [SEO 引擎](./seo-engine.md)
