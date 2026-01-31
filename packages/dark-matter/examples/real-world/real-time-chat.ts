/**
 * 即時聊天範例（Change Streams）
 * 展示使用 Change Streams 實現即時通訊
 */

import { Mongo } from '@gravito/dark-matter'

await Mongo.connect()

// 監聽新訊息
async function startMessageListener(roomId: string, callback: (message: any) => void) {
  const stream = Mongo.collection('messages').watch([
    {
      $match: {
        operationType: 'insert',
        'fullDocument.roomId': roomId,
      },
    },
  ])

  console.log(`開始監聽聊天室 ${roomId} 的訊息...`)

  for await (const change of stream) {
    const message = change.fullDocument
    callback(message)
  }
}

// 發送訊息
async function sendMessage(roomId: string, userId: string, content: string) {
  await Mongo.collection('messages').insert({
    roomId,
    userId,
    content,
    timestamp: new Date(),
    isRead: false,
  })
}

// 範例使用
startMessageListener('room123', (message) => {
  console.log(`[${message.timestamp}] ${message.userId}: ${message.content}`)
})

// 發送測試訊息
await sendMessage('room123', 'user1', 'Hello!')
await sendMessage('room123', 'user2', 'Hi there!')
