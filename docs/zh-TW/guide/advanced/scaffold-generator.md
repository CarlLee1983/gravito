---
title: Scaffold 專案生成器
description: 提供 MVC、DDD 與 Clean Architecture 的專案生成工具。
---

# Scaffold 專案生成器

Scaffold 提供 Gravito 的專案生成器，包含 MVC、DDD 與 Clean Architecture 等範本。

## 特色

- 內建多種架構範本（MVC / DDD / Clean）
- CLI 與程式化 API 雙模式
- 可擴充自訂 Generator
- 內建模板引擎與 Helpers

## 安裝

```bash
bun add @gravito/scaffold
```

## CLI 使用方式

```bash
npx gravito init my-app --architecture ddd
```

## 常用選項

```bash
npx gravito init my-app \
  --architecture clean \
  --package-manager bun \
  --skip-install \
  --skip-git
```

## 架構範本

| 類型 | 說明 |
| --- | --- |
| `enterprise-mvc` | 類 Laravel MVC 結構 |
| `clean` | 嚴格分層的 Clean Architecture |
| `ddd` | Domain-Driven Design（限界上下文） |

## 生成結果（範例）

```
my-app/
  src/
  tests/
  .env
  package.json
  README.md
```

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

## 模板引擎與 Helpers

Scaffold 內建 Handlebars 風格模板與常用字串轉換工具：

- `pascalCase` / `camelCase` / `kebabCase`
- `snakeCase` / `upperCase` / `lowerCase`
- `pluralize` / `singularize`

```ts
import { StubGenerator } from '@gravito/scaffold'

const generator = new StubGenerator()
generator.registerHelper('uppercase', (str) => str.toUpperCase())
const result = generator.render('Hello {{uppercase name}}!', { name: 'world' })
```

## 自訂 Generator

```ts
import { BaseGenerator, type GeneratorContext, type DirectoryNode } from '@gravito/scaffold'

export class MyCustomGenerator extends BaseGenerator {
  getDirectoryStructure(context: GeneratorContext): DirectoryNode[] {
    return [
      {
        type: 'directory',
        name: 'src',
        children: [{ type: 'file', name: 'index.ts', content: 'console.log(\"Hello\")' }],
      },
    ]
  }
}
```

## 下一步

- 參考 CLI 流程：[專案初始化](./cli-init.md)
