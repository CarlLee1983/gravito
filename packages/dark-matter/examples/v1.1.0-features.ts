/**
 * Dark Matter v1.1.0 功能展示範例
 *
 * 本範例展示 Dark Matter v1.1.0 的所有新功能：
 * 1. Soft Deletes（軟刪除）
 * 2. Schema Builder API
 * 3. GridFS 串流與進度追蹤
 * 4. 效能優化最佳實踐
 */

import { Mongo, MongoGridFS, schema } from '@gravito/dark-matter'

// ============================================================================
// 設定與連線
// ============================================================================

async function setup() {
  console.log('🔧 設定 MongoDB 連線...')

  Mongo.configure({
    default: 'main',
    connections: {
      main: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
        database: 'dark_matter_examples',
        maxPoolSize: 50,
        minPoolSize: 10,
      },
    },
  })

  await Mongo.connect()
  console.log('✅ 連線成功！\n')
}

// ============================================================================
// 範例 1: Soft Deletes（軟刪除）
// ============================================================================

async function softDeletesExample() {
  console.log('📚 範例 1: Soft Deletes（軟刪除）')
  console.log('='.repeat(60))

  // 清理舊資料
  await Mongo.collection('users').deleteMany()

  // 插入測試資料
  await Mongo.collection('users').insertMany([
    { name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { name: 'Bob', email: 'bob@example.com', role: 'user' },
    { name: 'Charlie', email: 'charlie@example.com', role: 'user' },
  ])

  console.log('✅ 已插入 3 個使用者')

  // 軟刪除一個使用者
  console.log('\n📝 軟刪除 Bob...')
  await Mongo.collection('users').where('name', 'Bob').softDelete()

  // 查詢（自動排除已刪除）
  const activeUsers = await Mongo.collection('users').get()
  console.log(`👥 活躍使用者數量: ${activeUsers.length}`) // 2
  console.log(
    '   ',
    activeUsers.map((u) => u.name)
  )

  // 包含已刪除的記錄
  const allUsers = await Mongo.collection('users').withTrashed().get()
  console.log(`📊 所有使用者（包含已刪除）: ${allUsers.length}`) // 3

  // 只查詢已刪除的記錄
  const trashedUsers = await Mongo.collection('users').onlyTrashed().get()
  console.log(`🗑️  已刪除的使用者: ${trashedUsers.length}`)
  console.log(
    '   ',
    trashedUsers.map((u) => u.name)
  )

  // 恢復已刪除的使用者
  console.log('\n♻️  恢復 Bob...')
  await Mongo.collection('users').where('name', 'Bob').restore()

  const restoredUsers = await Mongo.collection('users').get()
  console.log(`✅ 恢復後的活躍使用者: ${restoredUsers.length}`) // 3

  // 永久刪除
  console.log('\n🔥 永久刪除 Charlie...')
  await Mongo.collection('users').where('name', 'Charlie').forceDelete()

  const finalUsers = await Mongo.collection('users').withTrashed().get()
  console.log(`📊 永久刪除後的使用者數量: ${finalUsers.length}`) // 2

  console.log('\n✅ Soft Deletes 範例完成！\n')
}

// ============================================================================
// 範例 2: Schema Builder API
// ============================================================================

async function schemaBuilderExample() {
  console.log('📚 範例 2: Schema Builder API')
  console.log('='.repeat(60))

  // 建立使用者 Schema
  const userSchema = schema()
    .required('username', 'email', 'createdAt')
    .string('username', { minLength: 3, maxLength: 50 })
    .string('email', { pattern: '^.+@.+\\..+$' })
    .string('role', { enum: ['admin', 'user', 'moderator'] })
    .integer('age', { minimum: 0, maximum: 150 })
    .boolean('isActive')
    .date('createdAt')
    .array('permissions', 'string', { minItems: 0 })
    .object('profile', (s) =>
      s.string('bio', { maxLength: 500 }).string('avatar').integer('followers', { minimum: 0 })
    )

  console.log('✅ 已建立使用者 Schema')

  // 刪除舊的 collection（如果存在）
  try {
    await Mongo.database().dropCollection('validated_users')
  } catch {
    // Collection 不存在，忽略
  }

  // 建立帶有 Schema 驗證的 Collection
  await Mongo.database().createCollectionWithSchema('validated_users', userSchema, {
    validationLevel: 'strict',
    validationAction: 'error',
  })

  console.log('✅ 已建立帶有 Schema 驗證的 Collection')

  // 插入符合 Schema 的文檔
  console.log('\n📝 插入符合 Schema 的文檔...')
  try {
    await Mongo.collection('validated_users').insert({
      username: 'john_doe',
      email: 'john@example.com',
      role: 'admin',
      age: 30,
      isActive: true,
      createdAt: new Date(),
      permissions: ['read', 'write', 'delete'],
      profile: {
        bio: 'Software engineer',
        avatar: 'https://example.com/avatar.jpg',
        followers: 100,
      },
    })
    console.log('✅ 插入成功！')
  } catch (error) {
    console.error('❌ 插入失敗:', error)
  }

  // 嘗試插入不符合 Schema 的文檔
  console.log('\n📝 嘗試插入不符合 Schema 的文檔（缺少必填欄位）...')
  try {
    await Mongo.collection('validated_users').insert({
      username: 'ab', // 太短（minLength: 3）
      // 缺少 email 和 createdAt
    })
    console.log('❌ 不應該成功！')
  } catch (error: any) {
    console.log('✅ 驗證成功阻止了不符合規範的文檔')
    console.log('   錯誤:', error.message.split('\n')[0])
  }

  console.log('\n✅ Schema Builder 範例完成！\n')
}

// ============================================================================
// 範例 3: GridFS 串流與進度追蹤
// ============================================================================

async function gridFSExample() {
  console.log('📚 範例 3: GridFS 串流與進度追蹤')
  console.log('='.repeat(60))

  const db = (Mongo.database() as any).db
  const grid = new MongoGridFS(db)

  // 清理舊檔案
  try {
    const oldFiles = await grid.list()
    for (const file of oldFiles) {
      await grid.delete(file._id)
    }
  } catch {
    // 忽略
  }

  // 範例 3.1: 基本上傳下載
  console.log('\n📤 基本上傳下載...')
  const content = Buffer.from('Hello GridFS from Dark Matter v1.1.0!')
  const fileId = await grid.upload(content, {
    filename: 'hello.txt',
    contentType: 'text/plain',
    metadata: { author: 'Dark Matter Example', version: '1.1.0' },
  })
  console.log('✅ 檔案已上傳，ID:', fileId)

  const downloaded = await grid.download(fileId)
  console.log('✅ 檔案已下載:', downloaded.toString())

  // 範例 3.2: 串流上傳
  console.log('\n📤 串流上傳...')
  const streamContent = 'This is streaming upload content!'
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(streamContent))
      controller.close()
    },
  })

  let uploadBytes = 0
  const streamFileId = await grid.uploadStream(
    stream,
    { filename: 'stream-upload.txt' },
    (progress) => {
      uploadBytes = progress.bytesWritten
      console.log(`   上傳進度: ${progress.bytesWritten} bytes`)
    }
  )
  console.log('✅ 串流上傳完成！總共:', uploadBytes, 'bytes')

  // 範例 3.3: 串流下載
  console.log('\n📥 串流下載...')
  const downloadStream = grid.downloadStream(streamFileId)
  const reader = downloadStream.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const streamDownloaded = Buffer.concat(chunks.map((c) => Buffer.from(c)))
  console.log('✅ 串流下載完成:', streamDownloaded.toString())

  // 範例 3.4: 大檔案分片上傳
  console.log('\n📤 大檔案分片上傳（1MB）...')
  const largeSize = 1024 * 1024 // 1MB
  const largeContent = new Uint8Array(largeSize).fill(65) // 填充 'A'
  const largeBlob = new Blob([largeContent])

  const progressUpdates: number[] = []
  const largeFileId = await grid.uploadLargeFile(
    largeBlob,
    { filename: 'large-file.bin', chunkSizeBytes: 255 * 1024 },
    (progress) => {
      progressUpdates.push(progress.percentage)
      if (progress.percentage % 25 === 0 || progress.percentage === 100) {
        console.log(
          `   進度: ${progress.percentage}% (${progress.bytesWritten} / ${progress.totalBytes})`
        )
      }
    }
  )
  console.log(`✅ 大檔案上傳完成！共 ${progressUpdates.length} 次進度更新`)

  // 範例 3.5: 查詢檔案中繼資料
  console.log('\n📊 查詢檔案中繼資料...')
  const fileInfo = await grid.findById(fileId)
  if (fileInfo) {
    console.log('✅ 檔案資訊:')
    console.log('   檔名:', fileInfo.filename)
    console.log('   大小:', fileInfo.length, 'bytes')
    console.log('   上傳時間:', fileInfo.uploadDate)
    console.log('   Content-Type:', fileInfo.contentType)
    console.log('   Metadata:', fileInfo.metadata)
  }

  // 清理
  await grid.delete(fileId)
  await grid.delete(streamFileId)
  await grid.delete(largeFileId)

  console.log('\n✅ GridFS 範例完成！\n')
}

// ============================================================================
// 範例 4: 效能優化最佳實踐
// ============================================================================

async function performanceExample() {
  console.log('📚 範例 4: 效能優化最佳實踐')
  console.log('='.repeat(60))

  // 清理並準備測試資料
  await Mongo.collection('products').deleteMany()
  const testProducts = Array.from({ length: 1000 }, (_, i) => ({
    name: `Product ${i}`,
    price: Math.random() * 1000,
    category: ['electronics', 'clothing', 'food'][i % 3],
    inStock: i % 2 === 0,
    createdAt: new Date(),
  }))
  await Mongo.collection('products').insertMany(testProducts)
  console.log('✅ 已插入 1000 個測試商品')

  // 最佳實踐 1: 使用索引
  console.log('\n📊 最佳實踐 1: 建立索引')
  await Mongo.collection('products').createIndex({ category: 1, price: -1 })
  await Mongo.collection('products').createIndex({ inStock: 1, createdAt: -1 })
  console.log('✅ 已建立複合索引')

  // 最佳實踐 2: 使用投影（只選取需要的欄位）
  console.log('\n📊 最佳實踐 2: 使用投影')
  const startTime = Date.now()
  const products = await Mongo.collection('products')
    .select('name', 'price') // 只選取需要的欄位
    .where('category', 'electronics')
    .where('inStock', true)
    .limit(10)
    .get()
  const duration = Date.now() - startTime
  console.log(`✅ 查詢完成: ${products.length} 個結果，耗時 ${duration}ms`)
  console.log('   範例商品:', products[0])

  // 最佳實踐 3: 使用批次操作
  console.log('\n📊 最佳實踐 3: 批次操作')
  const bulkOps = [
    { updateOne: { filter: { name: 'Product 0' }, update: { $set: { featured: true } } } },
    { updateOne: { filter: { name: 'Product 1' }, update: { $set: { featured: true } } } },
    { updateOne: { filter: { name: 'Product 2' }, update: { $set: { featured: true } } } },
  ]
  const bulkResult = await Mongo.collection('products').bulkWrite(bulkOps)
  console.log(`✅ 批次更新完成: ${bulkResult.modifiedCount} 個文檔被修改`)

  // 最佳實踐 4: 使用 Aggregation Pipeline 優化
  console.log('\n📊 最佳實踐 4: Aggregation Pipeline')
  const stats = await Mongo.collection('products')
    .aggregate()
    .match({ inStock: true }) // 先過濾
    .group({
      _id: '$category',
      count: { $sum: 1 },
      avgPrice: { $avg: '$price' },
      maxPrice: { $max: '$price' },
    })
    .sort({ count: 'desc' })
    .get()
  console.log('✅ 統計結果:')
  stats.forEach((stat) => {
    console.log(`   ${stat._id}: ${stat.count} 個商品，平均價格 ${stat.avgPrice.toFixed(2)}`)
  })

  console.log('\n✅ 效能優化範例完成！\n')
}

// ============================================================================
// 主程式
// ============================================================================

async function main() {
  console.log('\n🚀 Dark Matter v1.1.0 功能展示')
  console.log('='.repeat(60))
  console.log()

  try {
    await setup()

    // 執行所有範例
    await softDeletesExample()
    await schemaBuilderExample()
    await gridFSExample()
    await performanceExample()

    console.log('🎉 所有範例執行完成！')
    console.log('\n如需了解更多，請參考：')
    console.log('  📖 README: packages/dark-matter/README.md')
    console.log('  📊 效能分析: packages/dark-matter/docs/performance-analysis.md')
    console.log('  📝 CHANGELOG: packages/dark-matter/CHANGELOG.md')
  } catch (error) {
    console.error('❌ 錯誤:', error)
  } finally {
    await Mongo.disconnect()
    console.log('\n✅ 已中斷連線')
  }
}

// 執行主程式
if (import.meta.main) {
  main()
}
