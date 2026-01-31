/**
 * 完整認證系統範例
 * 展示使用者註冊、登入、JWT、密碼加密
 */

import { Mongo } from '@gravito/dark-matter'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// 初始化
await Mongo.configure({
  default: 'main',
  connections: {
    main: { uri: 'mongodb://localhost:27017', database: 'auth_app' },
  },
})
await Mongo.connect()

// 建立唯一索引
await Mongo.database().collection('users').createIndex({ email: 1 }, { unique: true })

// 使用者註冊
async function register(email: string, password: string, name: string) {
  // 檢查使用者是否已存在
  const existing = await Mongo.collection('users').where('email', email).first()

  if (existing) {
    throw new Error('Email 已被使用')
  }

  // 加密密碼
  const hashedPassword = await bcrypt.hash(password, 10)

  // 建立使用者
  const result = await Mongo.collection('users').insert({
    email,
    password: hashedPassword,
    name,
    createdAt: new Date(),
    lastLoginAt: null,
    isActive: true,
  })

  return result.insertedId
}

// 使用者登入
async function login(email: string, password: string) {
  const user = await Mongo.collection('users').where('email', email).where('isActive', true).first()

  if (!user) {
    throw new Error('使用者不存在或已停用')
  }

  // 驗證密碼
  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw new Error('密碼錯誤')
  }

  // 更新最後登入時間
  await Mongo.collection('users').where('_id', user._id).update({ lastLoginAt: new Date() })

  // 產生 JWT
  const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })

  return { token, user: { id: user._id, email: user.email, name: user.name } }
}

// 驗證 Token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    throw new Error('Token 無效或已過期')
  }
}

// 範例使用
const userId = await register('user@example.com', 'password123', 'Alice')
console.log('註冊成功，使用者 ID：', userId)

const { token, user } = await login('user@example.com', 'password123')
console.log('登入成功：', user)
console.log('Token：', token)

// 驗證 Token
const decoded = verifyToken(token)
console.log('Token 驗證成功：', decoded)
