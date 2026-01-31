/**
 * 多租戶架構範例
 */

import { Mongo } from '@gravito/dark-matter'

// 為租戶建立專屬連線
async function setupTenant(tenantId: string) {
  const dbName = `tenant_${tenantId}`

  Mongo.addConnection(tenantId, {
    uri: 'mongodb://localhost:27017',
    database: dbName,
  })

  await Mongo.connect(tenantId)

  // 建立索引
  await Mongo.connection(tenantId)
    .database()
    .collection('users')
    .createIndex({ email: 1 }, { unique: true })
}

// 租戶專屬操作
async function getTenantData(tenantId: string, collection: string) {
  return await Mongo.connection(tenantId).collection(collection).get()
}

// 範例使用
await setupTenant('tenant001')
await setupTenant('tenant002')

// 每個租戶都有獨立的資料庫
const tenant1Users = await getTenantData('tenant001', 'users')
const tenant2Users = await getTenantData('tenant002', 'users')

console.log('租戶 1 使用者數：', tenant1Users.length)
console.log('租戶 2 使用者數：', tenant2Users.length)
