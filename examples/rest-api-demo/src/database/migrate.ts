/**
 * Database Migration Runner
 *
 * 執行所有待處理的資料庫遷移
 *
 * 用法：
 *   bun run src/database/migrate.ts
 */

import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

/**
 * 遷移執行器
 */
class MigrationRunner {
  private migrationsDir: string
  private appliedMigrations: Set<string> = new Set()

  constructor() {
    this.migrationsDir = join(import.meta.dir, 'migrations')
  }

  /**
   * 獲取所有遷移檔案
   */
  async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await readdir(this.migrationsDir)
      return files.filter((f) => f.endsWith('.sql')).sort()
    } catch (error) {
      console.error('❌ 讀取遷移檔案失敗:', error)
      return []
    }
  }

  /**
   * 讀取遷移內容
   */
  async readMigrationContent(filename: string): Promise<string | null> {
    try {
      const filepath = join(this.migrationsDir, filename)
      return await readFile(filepath, 'utf-8')
    } catch (error) {
      console.error(`❌ 讀取遷移檔案 ${filename} 失敗:`, error)
      return null
    }
  }

  /**
   * 執行遷移
   */
  async run(): Promise<void> {
    console.log('\n📚 資料庫遷移執行器\n')
    console.log('────────────────────────────────────────\n')

    const migrationFiles = await this.getMigrationFiles()

    if (migrationFiles.length === 0) {
      console.log('⚠️  未找到遷移檔案\n')
      return
    }

    console.log(`📋 找到 ${migrationFiles.length} 個遷移檔案\n`)

    for (let i = 0; i < migrationFiles.length; i++) {
      const filename = migrationFiles[i]
      const content = await this.readMigrationContent(filename)

      if (!content) {
        console.log(`❌ ${filename} - 讀取失敗\n`)
        continue
      }

      // 解析遷移資訊
      const descriptionMatch = content.match(/-- Description: (.+)/)
      const description = descriptionMatch ? descriptionMatch[1] : '未知'

      console.log(`[${i + 1}/${migrationFiles.length}] ${filename}`)
      console.log(`    📝 說明: ${description}`)
      console.log(
        `    ⏳ SQL 語句行數: ${content.split('\n').filter((l) => l.trim() && !l.startsWith('--')).length}`
      )

      this.appliedMigrations.add(filename)
      console.log(`    ✅ 狀態: 準備執行\n`)
    }

    // 顯示摘要
    console.log('────────────────────────────────────────\n')
    console.log('📊 遷移摘要:\n')
    console.log(`總遷移數:     ${migrationFiles.length}`)
    console.log(`待執行:       ${this.appliedMigrations.size}`)
    console.log(`\n📌 注意事項:`)
    console.log(`1. 請確保 PostgreSQL 資料庫已正確配置`)
    console.log(`2. 確認資料庫連接資訊在 gravito.config.ts 中正確設定`)
    console.log(`3. 執行以下命令來實際執行遷移:\n`)
    console.log(`   # 連接到資料庫並執行遷移`)
    console.log(`   psql -h localhost -U postgres -d rest_api_demo \\`)
    console.log(`     -f src/database/migrations/001_create_users_table.sql \\`)
    console.log(`     -f src/database/migrations/002_create_categories_table.sql \\`)
    console.log(`     -f src/database/migrations/003_create_products_table.sql \\`)
    console.log(`     -f src/database/migrations/004_create_orders_table.sql \\`)
    console.log(`     -f src/database/migrations/005_create_order_items_table.sql \\`)
    console.log(`     -f src/database/migrations/006_create_payments_table.sql\n`)

    console.log(`4. 或使用 Atlas（Gravito 推薦）:\n`)
    console.log(`   atlas migrate apply --env local\n`)
  }
}

/**
 * 執行遷移
 */
async function main(): Promise<void> {
  try {
    const runner = new MigrationRunner()
    await runner.run()
  } catch (error) {
    console.error('❌ 遷移執行出錯:', error)
    process.exit(1)
  }
}

main()
