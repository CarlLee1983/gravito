---
title: Scaffold 專案生成器
description: 提供 MVC、DDD 與 Clean Architecture 的專案生成工具。
---

# Scaffold 專案生成器

Scaffold 提供 Gravito 的專案生成器，包含 MVC、DDD 與 Clean Architecture 等範本。

## 安裝

```bash
bun add @gravito/scaffold
```

## CLI 使用方式

```bash
npx gravito init my-app --architecture ddd
```

## 架構範本

| 類型 | 說明 |
| --- | --- |
| `enterprise-mvc` | 類 Laravel MVC 結構 |
| `clean` | 嚴格分層的 Clean Architecture |
| `ddd` | Domain-Driven Design（限界上下文） |

## 程式化 API

```ts
import { Scaffold } from '@gravito/scaffold'

const scaffold = new Scaffold({
  name: 'my-app',
  architecture: 'ddd',
  targetPath: './my-app',
  packageManager: 'bun',
})

await scaffold.generate()
```

## 下一步

- 參考 CLI 流程：[專案初始化](./cli-init.md)
